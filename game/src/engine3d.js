// engine3d.js — hand-written WebGL1 engine (no libraries).
// mat4 helpers, shader setup, textured/colored box + quad drawing.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var E = S.Engine = {};

  E.mat4Identity = function () {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  };
  E.mat4Multiply = function (a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  };
  E.mat4Perspective = function (fovY, aspect, near, far) {
    var f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  };
  E.mat4LookAt = function (eye, target, up) {
    var zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    var zl = Math.sqrt(zx * zx + zy * zy + zz * zz) || 1; zx /= zl; zy /= zl; zz /= zl;
    var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    var xl = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1; xx /= xl; xy /= xl; xz /= xl;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1];
  };
  E.mat4Translate = function (m, x, y, z) {
    var o = m.slice();
    o[12] = m[0] * x + m[4] * y + m[8] * z + m[12];
    o[13] = m[1] * x + m[5] * y + m[9] * z + m[13];
    o[14] = m[2] * x + m[6] * y + m[10] * z + m[14];
    o[15] = m[3] * x + m[7] * y + m[11] * z + m[15];
    return o;
  };
  E.mat4Scale = function (m, x, y, z) {
    var o = m.slice();
    for (var i = 0; i < 4; i++) { o[i] *= x; o[4 + i] *= y; o[8 + i] *= z; }
    return o;
  };
  E.mat4RotateY = function (m, a) {
    var c = Math.cos(a), s = Math.sin(a);
    var r = [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
    return E.mat4Multiply(m, r);
  };

  // Unit-cube faces (36 verts) with per-face shade and UVs.
  var CUBE = (function () {
    var quads = [
      { n: [0, 0, 1], s: 1.0, v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
      { n: [0, 0, -1], s: 0.55, v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
      { n: [1, 0, 0], s: 0.8, v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
      { n: [-1, 0, 0], s: 0.8, v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
      { n: [0, 1, 0], s: 1.15, v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
      { n: [0, -1, 0], s: 0.4, v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] }
    ];
    var pos = [], shade = [], uv = [];
    quads.forEach(function (q) {
      var idx = [0, 1, 2, 0, 2, 3];
      var uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
      idx.forEach(function (k) {
        pos.push(q.v[k][0] * 0.5, q.v[k][1] * 0.5, q.v[k][2] * 0.5);
        shade.push(q.s); uv.push(uvs[k][0], uvs[k][1]);
      });
    });
    return { pos: pos, shade: shade, uv: uv };
  })();

  E.gl = null; E.ready = false; E.drawCalls = 0;
  E.init = function (canvas) {
    E.drawCalls = 0;
    if (!canvas || !canvas.getContext) return false;
    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) return false;
    E.gl = gl;
    var vs = 'attribute vec3 aPos;attribute float aShade;attribute vec2 aUv;' +
      'uniform mat4 uProj;uniform mat4 uView;uniform mat4 uModel;' +
      'varying float vShade;varying vec2 vUv;' +
      'void main(){vShade=aShade;vUv=aUv;gl_Position=uProj*uView*uModel*vec4(aPos,1.0);}';
    var fs = 'precision mediump float;varying float vShade;varying vec2 vUv;' +
      'uniform vec3 uColor;uniform sampler2D uTex;uniform float uUseTex;' +
      'void main(){vec3 c=uColor;if(uUseTex>0.5){c=texture2D(uTex,vUv).rgb;}gl_FragColor=vec4(c*vShade,1.0);}';
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return false;
    var prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    E.prog = prog;
    E.loc = {
      pos: gl.getAttribLocation(prog, 'aPos'), shade: gl.getAttribLocation(prog, 'aShade'),
      uv: gl.getAttribLocation(prog, 'aUv'), proj: gl.getUniformLocation(prog, 'uProj'),
      view: gl.getUniformLocation(prog, 'uView'), model: gl.getUniformLocation(prog, 'uModel'),
      color: gl.getUniformLocation(prog, 'uColor'), tex: gl.getUniformLocation(prog, 'uTex'),
      useTex: gl.getUniformLocation(prog, 'uUseTex')
    };
    function buf(data, loc, size) {
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return b;
    }
    buf(CUBE.pos, E.loc.pos, 3); buf(CUBE.shade, E.loc.shade, 1); buf(CUBE.uv, E.loc.uv, 2);
    gl.enable(gl.DEPTH_TEST);
    E.ready = true;
    return true;
  };
  E.hexColor = function (hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255];
  };
  E.createTexture = function (canvas) {
    if (!E.gl || !canvas) return null;
    var gl = E.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  E.beginFrame = function (w, h, proj, view, sky) {
    var gl = E.gl; if (!gl) return;
    gl.viewport(0, 0, w, h);
    gl.clearColor(sky[0], sky[1], sky[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(E.loc.proj, false, new Float32Array(proj));
    gl.uniformMatrix4fv(E.loc.view, false, new Float32Array(view));
    E.drawCalls = 0;
  };
  E.drawBox = function (x, y, z, w, h, d, color, tex, rotY) {
    var gl = E.gl; if (!gl) return;
    var m = E.mat4Identity();
    m = E.mat4Translate(m, x, y, z);
    if (rotY) m = E.mat4RotateY(m, rotY);
    m = E.mat4Scale(m, w, h, d);
    gl.uniformMatrix4fv(E.loc.model, false, new Float32Array(m));
    var c = typeof color === 'string' ? E.hexColor(color) : (color || [1, 0, 1]);
    gl.uniform3f(E.loc.color, c[0], c[1], c[2]);
    if (tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(E.loc.tex, 0); gl.uniform1f(E.loc.useTex, 1); }
    else gl.uniform1f(E.loc.useTex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
    E.drawCalls++;
  };
})(typeof window !== 'undefined' ? window : globalThis);
