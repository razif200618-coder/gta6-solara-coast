// engine3d.js — a minimal WebGL1 3D engine written from scratch for SOLARA HEAT.
// No external library: hand-written shaders, matrices and a unit cube used
// for every box in the world. World coordinates: x east, z south (world y),
// y up. A 2D angle a (atan2(dy,dx) in the old top-down plane) maps to a
// heading whose forward vector is (cos a, 0, sin a); rotating a model about
// Y by -a gives exactly that forward.
(function (global) {
  'use strict';

  let gl = null, prog = null, buf = null;
  let uModel = null, uView = null, uProj = null, uColor = null, uUnlit = null, uAlpha = null, uFog = null;
  let viewMat = null, projMat = null;
  let camPos = [0, 0, 0];
  const SKY = [0.62, 0.83, 0.95];

  // ---- matrices (column-major, like WebGL expects) ----
  function matIdentity() {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  }
  function matMul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  }
  function matTranslate(x, y, z) {
    const m = matIdentity(); m[12] = x; m[13] = y; m[14] = z; return m;
  }
  function matScale(x, y, z) {
    const m = matIdentity(); m[0] = x; m[5] = y; m[10] = z; return m;
  }
  function matRotY(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  }
  function matPerspective(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function matLookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
    let zx = ex - cx, zy = ey - cy, zz = ez - cz;
    let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * ex + xy * ey + xz * ez), -(yx * ex + yy * ey + yz * ez), -(zx * ex + zy * ey + zz * ez), 1];
  }

  // Unit cube centred at origin, 1x1x1, with outward normals (36 verts).
  function cubeData() {
    const faces = [
      // +x
      [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, -1], [1, 1, 1], [1, -1, 1], [1, 0, 0]],
      // -x
      [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, 1, -1], [-1, -1, -1], [-1, 0, 0]],
      // +y
      [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [-1, 1, -1], [1, 1, 1], [1, 1, -1], [0, 1, 0]],
      // -y
      [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, -1], [1, -1, 1], [0, -1, 0]],
      // +z
      [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, -1, 1], [1, 1, 1], [-1, 1, 1], [0, 0, 1]],
      // -z
      [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [0, 0, -1]]
    ];
    const pos = [], nrm = [];
    for (const f of faces) {
      const n = f[6];
      for (let i = 0; i < 6; i++) {
        pos.push(f[i][0] * 0.5, f[i][1] * 0.5, f[i][2] * 0.5);
        nrm.push(n[0], n[1], n[2]);
      }
    }
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm) };
  }

  function hexRgb(hex) {
    const h = hex.replace('#', '');
    const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
  }

  function init(canvas) {
    gl = canvas.getContext('webgl', { antialias: true, alpha: false }) ||
      canvas.getContext('experimental-webgl');
    if (!gl) return false;
    const vs = 'attribute vec3 aPos; attribute vec3 aNrm; uniform mat4 uModel; uniform mat4 uView; uniform mat4 uProj; varying vec3 vNrm; varying float vDist; void main(){ vec4 wp = uModel * vec4(aPos, 1.0); vec4 vp = uView * wp; vDist = -vp.z; vNrm = mat3(uModel) * aNrm; gl_Position = uProj * vp; }';
    const fs = 'precision mediump float; varying vec3 vNrm; varying float vDist; uniform vec3 uColor; uniform float uUnlit; uniform float uAlpha; uniform vec3 uFogColor; void main(){ vec3 n = normalize(vNrm); vec3 sun = normalize(vec3(0.45, 0.8, 0.35)); float dif = max(0.0, dot(n, sun)); float light = mix(0.55 + 0.45 * dif, 1.0, uUnlit); vec3 col = uColor * light; float f = clamp((vDist - 500.0) / 1100.0, 0.0, 0.75); col = mix(col, uFogColor, f); gl_FragColor = vec4(col, uAlpha); }';
    function shader(type, src) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    }
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const data = cubeData();
    buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const stride = 6 * 4;
    const all = new Float32Array(36 * 6);
    for (let i = 0; i < 36; i++) {
      all[i * 6] = data.pos[i * 3]; all[i * 6 + 1] = data.pos[i * 3 + 1]; all[i * 6 + 2] = data.pos[i * 3 + 2];
      all[i * 6 + 3] = data.nrm[i * 3]; all[i * 6 + 4] = data.nrm[i * 3 + 1]; all[i * 6 + 5] = data.nrm[i * 3 + 2];
    }
    gl.bufferData(gl.ARRAY_BUFFER, all, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    const aNrm = gl.getAttribLocation(prog, 'aNrm');
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aNrm); gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, stride, 12);
    uModel = gl.getUniformLocation(prog, 'uModel');
    uView = gl.getUniformLocation(prog, 'uView');
    uProj = gl.getUniformLocation(prog, 'uProj');
    uColor = gl.getUniformLocation(prog, 'uColor');
    uUnlit = gl.getUniformLocation(prog, 'uUnlit');
    uAlpha = gl.getUniformLocation(prog, 'uAlpha');
    uFog = gl.getUniformLocation(prog, 'uFogColor');
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(SKY[0], SKY[1], SKY[2], 1);
    return true;
  }

  function beginFrame(eye, center, up) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    camPos = eye;
    viewMat = matLookAt(eye[0], eye[1], eye[2], center[0], center[1], center[2], up[0], up[1], up[2]);
    projMat = matPerspective(62 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 1, 4000);
    gl.uniformMatrix4fv(uView, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(uProj, false, new Float32Array(projMat));
    gl.uniform3fv(uFog, new Float32Array(SKY));
  }

  // Draw a box centred at (x, y, z) with size (sx, sy, sz), rotated ry about Y.
  // opts: {unlit, alpha}
  function box(x, y, z, sx, sy, sz, ry, color, opts) {
    opts = opts || {};
    const c = typeof color === 'string' ? hexRgb(color) : color;
    const m = matMul(matTranslate(x, y, z), matMul(matRotY(ry || 0), matScale(sx, sy, sz)));
    gl.uniformMatrix4fv(uModel, false, new Float32Array(m));
    gl.uniform3fv(uColor, new Float32Array(c));
    gl.uniform1f(uUnlit, opts.unlit ? 1 : 0);
    gl.uniform1f(uAlpha, opts.alpha != null ? opts.alpha : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }

  global.SolaraGL3D = { init, beginFrame, box, hexRgb, camPos: function () { return camPos; }, SKY };
})(window);
