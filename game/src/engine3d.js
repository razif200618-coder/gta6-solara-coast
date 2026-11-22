// engine3d.js — a minimal WebGL1 3D engine written from scratch for SOLARA HEAT.
// No external library: hand-written shaders, matrices, a unit cube used for
// every box in the world, plus runtime-generated canvas textures (window
// grids, neon signs) so buildings read as real facades, not flat boxes.
// World coordinates: x east, z south (world y), y up. A 2D angle a
// (atan2(dy,dx) in the old top-down plane) maps to a heading whose forward
// vector is (cos a, 0, sin a); rotating a model about Y by -a gives exactly
// that forward.
(function (global) {
  'use strict';

  let gl = null, prog = null, buf = null;
  let uModel = null, uView = null, uProj = null, uColor = null, uUnlit = null, uAlpha = null, uFog = null;
  let viewMat = null, projMat = null;
  let camPos = [0, 0, 0];
  // Warm late-afternoon sky over Solara Coast.
  const SKY = [0.66, 0.80, 0.93];

  // Textured-quad program (facades, signs): same view/proj as the box program.
  let tProg = null, tBuf = null;
  let tModel = null, tView = null, tProj = null, tLit = null, tAlpha = null, tFog = null, tSampler = null;
  const texCache = {};

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
  function matRotX(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  }
  function matRotZ(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
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
  function shade(hex, f) {
    const c = hexRgb(hex);
    return [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)];
  }

  function compileShader(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  }

  function init(canvas) {
    gl = canvas.getContext('webgl', { antialias: true, alpha: false }) ||
      canvas.getContext('experimental-webgl');
    if (!gl) return false;
    const vs = 'attribute vec3 aPos; attribute vec3 aNrm; uniform mat4 uModel; uniform mat4 uView; uniform mat4 uProj; varying vec3 vNrm; varying float vDist; void main(){ vec4 wp = uModel * vec4(aPos, 1.0); vec4 vp = uView * wp; vDist = -vp.z; vNrm = mat3(uModel) * aNrm; gl_Position = uProj * vp; }';
    const fs = 'precision mediump float; varying vec3 vNrm; varying float vDist; uniform vec3 uColor; uniform float uUnlit; uniform float uAlpha; uniform vec3 uFogColor; void main(){ vec3 n = normalize(vNrm); vec3 sun = normalize(vec3(0.55, 0.62, 0.35)); float dif = max(0.0, dot(n, sun)); float light = mix(0.55 + 0.45 * dif, 1.0, uUnlit); vec3 col = uColor * light; float f = clamp((vDist - 500.0) / 1100.0, 0.0, 0.75); col = mix(col, uFogColor, f); gl_FragColor = vec4(col, uAlpha); }';
    prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fs));
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

    // ---- textured quad program (unit quad in the XY plane, facing +Z) ----
    const tvs = 'attribute vec3 aPos; attribute vec2 aUV; uniform mat4 uModel; uniform mat4 uView; uniform mat4 uProj; varying vec2 vUV; varying vec3 vNrm; void main(){ vec4 wp = uModel * vec4(aPos, 1.0); vNrm = mat3(uModel) * vec3(0.0, 0.0, 1.0); gl_Position = uProj * (uView * wp); vUV = aUV; }';
    const tfs = 'precision mediump float; varying vec2 vUV; varying vec3 vNrm; uniform sampler2D uTex; uniform float uLit; uniform float uAlpha; uniform vec3 uFogColor; void main(){ vec4 t = texture2D(uTex, vUV); if (t.a < 0.05) discard; vec3 n = normalize(vNrm); vec3 sun = normalize(vec3(0.55, 0.62, 0.35)); float dif = max(0.0, dot(n, sun)); float light = mix(1.0, 0.62 + 0.38 * dif, uLit); gl_FragColor = vec4(t.rgb * light, t.a * uAlpha); }';
    tProg = gl.createProgram();
    gl.attachShader(tProg, compileShader(gl.VERTEX_SHADER, tvs));
    gl.attachShader(tProg, compileShader(gl.FRAGMENT_SHADER, tfs));
    gl.linkProgram(tProg);
    if (!gl.getProgramParameter(tProg, gl.LINK_STATUS)) throw new Error('tex link: ' + gl.getProgramInfoLog(tProg));
    // Quad: two triangles, positions + UVs.
    const q = new Float32Array([
      -0.5, -0.5, 0, 0, 0,  0.5, -0.5, 0, 1, 0,  0.5, 0.5, 0, 1, 1,
      -0.5, -0.5, 0, 0, 0,  0.5, 0.5, 0, 1, 1,  -0.5, 0.5, 0, 0, 1
    ]);
    tBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
    gl.bufferData(gl.ARRAY_BUFFER, q, gl.STATIC_DRAW);
    tModel = gl.getUniformLocation(tProg, 'uModel');
    tView = gl.getUniformLocation(tProg, 'uView');
    tProj = gl.getUniformLocation(tProg, 'uProj');
    tLit = gl.getUniformLocation(tProg, 'uLit');
    tAlpha = gl.getUniformLocation(tProg, 'uAlpha');
    tFog = gl.getUniformLocation(tProg, 'uFogColor');
    tSampler = gl.getUniformLocation(tProg, 'uTex');

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
    gl.useProgram(prog);
    gl.uniformMatrix4fv(uView, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(uProj, false, new Float32Array(projMat));
    gl.uniform3fv(uFog, new Float32Array(SKY));
  }

  function useBoxProg() {
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const stride = 6 * 4;
    const aPos = gl.getAttribLocation(prog, 'aPos');
    const aNrm = gl.getAttribLocation(prog, 'aNrm');
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aNrm); gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, stride, 12);
    gl.uniformMatrix4fv(uView, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(uProj, false, new Float32Array(projMat));
    gl.uniform3fv(uFog, new Float32Array(SKY));
  }

  function useTexProg() {
    gl.useProgram(tProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
    const stride = 5 * 4;
    const aPos = gl.getAttribLocation(tProg, 'aPos');
    const aUV = gl.getAttribLocation(tProg, 'aUV');
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aUV); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 12);
    gl.uniformMatrix4fv(tView, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(tProj, false, new Float32Array(projMat));
    gl.uniform3fv(tFog, new Float32Array(SKY));
  }

  // Draw a box centred at (x, y, z) with size (sx, sy, sz), rotated ry about Y.
  // opts: {unlit, alpha, rx, rz} — rx/rz are extra rotations about X/Z.
  function box(x, y, z, sx, sy, sz, ry, color, opts) {
    opts = opts || {};
    useBoxProg();
    const c = typeof color === 'string' ? hexRgb(color) : color;
    let m = matMul(matTranslate(x, y, z), matRotY(ry || 0));
    if (opts.rx) m = matMul(m, matRotX(opts.rx));
    if (opts.rz) m = matMul(m, matRotZ(opts.rz));
    m = matMul(m, matScale(sx, sy, sz));
    gl.uniformMatrix4fv(uModel, false, new Float32Array(m));
    gl.uniform3fv(uColor, new Float32Array(c));
    gl.uniform1f(uUnlit, opts.unlit ? 1 : 0);
    gl.uniform1f(uAlpha, opts.alpha != null ? opts.alpha : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }

  // ---- runtime canvas textures (generated from our own code, no images) ----
  function uploadTexture(key, canvas) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    texCache[key] = tex;
    return tex;
  }
  // Seeded pseudo-random from an integer (deterministic per building).
  function srand(n) {
    let a = (n * 2654435761) >>> 0;
    return function () { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
  }
  // Facade texture: building colour + a grid of windows, some lit warm.
  function facadeTexture(color, pattern) {
    const key = 'facade|' + color + '|' + pattern;
    if (texCache[key]) return texCache[key];
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 192;
    const g = cv.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 128, 192);
    // Subtle vertical shading.
    const grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.18)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.06)'); grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 192);
    const rnd = srand(pattern * 97 + color.length * 13);
    const cols = 4, rows = 7;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = rnd() < 0.42;
        g.fillStyle = lit ? '#ffd98a' : (rnd() < 0.5 ? '#2c3e55' : '#3d5a74');
        g.fillRect(10 + c * 30, 12 + r * 26, 18, 15);
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.fillRect(10 + c * 30, 12 + r * 26, 18, 3);
      }
    }
    // Ground-floor shopfront band.
    g.fillStyle = 'rgba(20,24,32,0.85)'; g.fillRect(0, 168, 128, 24);
    g.fillStyle = '#ffd94d'; g.fillRect(8, 174, 40, 12);
    g.fillStyle = '#7fd4ff'; g.fillRect(56, 174, 64, 12);
    return uploadTexture(key, cv);
  }
  // Neon sign texture: invented business name, bright on dark.
  function signTexture(text, sub, bg, fg) {
    const key = 'sign|' + text + '|' + bg + '|' + fg;
    if (texCache[key]) return texCache[key];
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
    const g = cv.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 256, 96);
    g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, 248, 88);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 30px sans-serif';
    g.fillText(text, 128, sub ? 38 : 48);
    if (sub) { g.font = '16px sans-serif'; g.fillText(sub, 128, 70); }
    return uploadTexture(key, cv);
  }
  // Draw a textured quad centred at (x, y, z), size w x h, facing ry (0 = +Z).
  // opts: {lit (0 = full bright, 1 = sun-lit), alpha}
  function quad(x, y, z, w, h, ry, tex, opts) {
    opts = opts || {};
    useTexProg();
    const m = matMul(matTranslate(x, y, z), matMul(matRotY(ry || 0), matScale(w, h, 1)));
    gl.uniformMatrix4fv(tModel, false, new Float32Array(m));
    gl.uniform1f(tLit, opts.lit ? 1 : 0);
    gl.uniform1f(tAlpha, opts.alpha != null ? opts.alpha : 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(tSampler, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  global.SolaraGL3D = { init, beginFrame, box, quad, hexRgb, shade, facadeTexture, signTexture, camPos: function () { return camPos; }, SKY };
})(window);
