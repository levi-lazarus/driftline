/**
 * DRIFTLINE — Scroll-driven 3D sneaker
 * A tiny hand-written WebGL2 renderer (no libraries): loads one GLB, draws it
 * with a compact PBR shader, and maps scroll progress to a full rotation.
 *
 * Model: "MaterialsVariantsShoe" © 2020 Shopify Inc., CC-BY 4.0, via
 * KhronosGroup/glTF-Sample-Assets. Recoloured to DRIFTLINE lime and resized.
 */
import { clamp, lerp, onScroll, prefersReducedMotion } from './utils.js';

const MODEL_URL = 'assets/models/volt-runner.glb';
const TAU = Math.PI * 2;

/* ---- Minimal mat4 helpers (column-major, like GLSL) ----------------------- */
const mat4 = {
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  },
  translate(x, y, z) {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  },
  scale(s) {
    return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]);
  },
  rotX(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  },
  rotY(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  },
  rotZ(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },
  normal3(m) {
    // Model matrix only rotates + uniformly scales, so its upper 3x3 works (shader renormalises).
    return new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);
  },
};

/* ---- Shaders --------------------------------------------------------------- */
const VERT = `#version 300 es
in vec3 aPos;
in vec3 aNormal;
in vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProj;
uniform mat3 uNormalMat;
out vec3 vPos;
out vec3 vNormal;
out vec2 vUv;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vPos = world.xyz;
  vNormal = uNormalMat * aNormal;
  vUv = aUv;
  gl_Position = uViewProj * world;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vPos;
in vec3 vNormal;
in vec2 vUv;
uniform sampler2D uBase;
uniform sampler2D uOrm;
uniform sampler2D uNormal;
uniform vec3 uCam;
uniform vec3 uRim;
out vec4 outColor;

const float PI = 3.14159265;

// Normal mapping without stored tangents (screen-space cotangent frame).
mat3 cotangentFrame(vec3 N, vec3 p, vec2 uv) {
  vec3 dp1 = dFdx(p), dp2 = dFdy(p);
  vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, N), dp1perp = cross(N, dp1);
  vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
  vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
  float invmax = inversesqrt(max(max(dot(T, T), dot(B, B)), 1e-12));
  return mat3(T * invmax, B * invmax, N);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 light(vec3 N, vec3 V, vec3 L, vec3 color, vec3 diff, vec3 F0, float rough) {
  vec3 H = normalize(L + V);
  float NdL = max(dot(N, L), 0.0);
  float NdV = max(dot(N, V), 1e-3);
  float NdH = max(dot(N, H), 0.0);
  float a = rough * rough;
  float a2 = a * a;
  float d = NdH * NdH * (a2 - 1.0) + 1.0;
  float D = a2 / (PI * d * d);
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float G = (NdL / (NdL * (1.0 - k) + k)) * (NdV / (NdV * (1.0 - k) + k));
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  vec3 spec = D * G * F / (4.0 * NdL * NdV + 1e-4);
  return ((1.0 - F) * diff / PI + spec) * color * NdL;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 tn = texture(uNormal, vUv).xyz * 2.0 - 1.0;
  N = normalize(cotangentFrame(N, vPos, vUv) * tn);

  vec3 base = pow(texture(uBase, vUv).rgb, vec3(2.2));
  vec3 orm = texture(uOrm, vUv).rgb;
  float ao = orm.r;
  float rough = clamp(orm.g, 0.06, 1.0);
  float metal = orm.b;

  vec3 V = normalize(uCam - vPos);
  vec3 F0 = mix(vec3(0.04), base, metal);
  vec3 diff = base * (1.0 - metal);

  vec3 col = vec3(0.0);
  col += light(N, V, normalize(vec3(0.6, 0.9, 0.7)), vec3(3.2), diff, F0, rough);
  col += light(N, V, normalize(vec3(-0.8, 0.35, 0.5)), vec3(1.1), diff, F0, rough);
  col += light(N, V, normalize(vec3(0.0, 0.5, -1.0)), vec3(1.6), diff, F0, rough);

  // Hemisphere ambient + gradient "studio" reflection.
  float NdV = max(dot(N, V), 1e-3);
  vec3 amb = mix(vec3(0.16, 0.16, 0.18), vec3(0.62, 0.63, 0.66), N.y * 0.5 + 0.5);
  vec3 R = reflect(-V, N);
  vec3 env = mix(vec3(0.05), vec3(1.0), smoothstep(-0.1, 0.9, R.y));
  vec3 Fa = F0 + (max(vec3(1.0 - rough), F0) - F0) * pow(1.0 - NdV, 5.0);
  col += (diff * amb + env * Fa * (1.0 - rough * 0.75)) * ao;

  // Brand-coloured rim light.
  col += uRim * pow(1.0 - NdV, 3.0) * 0.55;

  outColor = vec4(pow(aces(col * 0.9), vec3(1.0 / 2.2)), 1.0);
}`;

/* ---- GLB parsing ----------------------------------------------------------- */
async function loadGlb(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Model request failed (${res.status})`);
  const buf = await res.arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('Not a GLB file');
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  const binStart = 20 + jsonLen + 8;

  const viewBytes = (i) => {
    const v = json.bufferViews[i];
    return new Uint8Array(buf, binStart + (v.byteOffset || 0), v.byteLength);
  };
  const accessor = (i) => {
    const a = json.accessors[i];
    const v = json.bufferViews[a.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const Type = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType];
    const offset = binStart + (v.byteOffset || 0) + (a.byteOffset || 0);
    return { data: new Type(buf, offset, a.count * size), min: a.min, max: a.max };
  };

  const prim = json.meshes[0].primitives[0];
  const mat = json.materials[prim.material || 0];
  const imageFor = (texInfo) => {
    const img = json.images[json.textures[texInfo.index].source];
    return new Blob([viewBytes(img.bufferView)], { type: img.mimeType });
  };

  return {
    position: accessor(prim.attributes.POSITION),
    normal: accessor(prim.attributes.NORMAL),
    uv: accessor(prim.attributes.TEXCOORD_0),
    indices: accessor(prim.indices),
    images: {
      base: imageFor(mat.pbrMetallicRoughness.baseColorTexture),
      orm: imageFor(mat.pbrMetallicRoughness.metallicRoughnessTexture),
      normal: imageFor(mat.normalTexture),
    },
  };
}

/* ---- WebGL setup ----------------------------------------------------------- */
function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function createProgram(gl) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

async function createTexture(gl, blob, aniso) {
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none',
  });
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // glTF UVs are top-left origin
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
  bitmap.close?.();
  return tex;
}

function attribute(gl, program, name, data, size) {
  const loc = gl.getAttribLocation(program, name);
  if (loc < 0) return;
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
}

/* ---- Public API ------------------------------------------------------------ */
/**
 * @param {HTMLElement} stage  element holding the canvas (gets is-ready / is-failed)
 * @param {HTMLElement} zone   element whose scroll passage drives the rotation
 */
export async function initShoe3D(stage, zone) {
  const canvas = stage.querySelector('canvas');
  const gl = canvas?.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) throw new Error('WebGL2 unavailable');

  const model = await loadGlb(MODEL_URL);
  const program = createProgram(gl);
  gl.useProgram(program);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  attribute(gl, program, 'aPos', model.position.data, 3);
  attribute(gl, program, 'aNormal', model.normal.data, 3);
  attribute(gl, program, 'aUv', model.uv.data, 2);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices.data, gl.STATIC_DRAW);
  const indexType = model.indices.data instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
  const indexCount = model.indices.data.length;

  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const [base, orm, normal] = await Promise.all([
    createTexture(gl, model.images.base, aniso),
    createTexture(gl, model.images.orm, aniso),
    createTexture(gl, model.images.normal, aniso),
  ]);
  [base, orm, normal].forEach((tex, i) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  });

  const u = (n) => gl.getUniformLocation(program, n);
  const uni = {
    model: u('uModel'), viewProj: u('uViewProj'), normalMat: u('uNormalMat'),
    cam: u('uCam'), rim: u('uRim'),
  };
  gl.uniform1i(u('uBase'), 0);
  gl.uniform1i(u('uOrm'), 1);
  gl.uniform1i(u('uNormal'), 2);
  gl.uniform3f(uni.rim, 0.78, 1.0, 0.24); // #c6ff3d
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);

  // Centre the mesh and normalise its longest side to 2 units.
  const { min, max } = model.position;
  const centre = [0, 1, 2].map((i) => (min[i] + max[i]) / 2);
  const longest = Math.max(...[0, 1, 2].map((i) => max[i] - min[i]));
  const fit = mat4.mul(mat4.scale(2 / longest), mat4.translate(-centre[0], -centre[1], -centre[2]));

  /* ---- Sizing ---- */
  const CAM_Z = 4.8;
  const FOV = (26 * Math.PI) / 180;
  let viewProj = null;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    const aspect = w / h;
    // Keep the shoe (radius ~1.15) inside the frame on narrow canvases too.
    const vfov = aspect < 1.25 ? 2 * Math.atan(Math.tan(FOV / 2) * (1.25 / aspect)) : FOV;
    viewProj = mat4.mul(mat4.perspective(vfov, aspect, 0.1, 50), mat4.translate(0, 0, -CAM_Z));
    gl.uniform3f(uni.cam, 0, 0, CAM_Z);
    needsDraw = true;
  };

  /* ---- Animation state ---- */
  const reduced = prefersReducedMotion();
  const target = { p: 0.5 };
  const current = { p: 0.5 };
  let needsDraw = true;
  let visible = false;
  let raf = 0;
  const shadow = stage.querySelector('[data-spin-shadow]');

  const draw = (time) => {
    const p = current.p;
    const bob = reduced ? 0 : Math.sin(time / 900) * 0.04;
    // One full turn across the zone; tilt and drift give it a "falling" path.
    const spinY = -0.55 + p * TAU;
    const tiltX = 0.32 - Math.sin(p * Math.PI) * 0.2;
    const roll = -0.18 + Math.sin(p * TAU) * 0.14;
    const drift = 0.28 - p * 0.56 + bob;

    const modelM = mat4.mul(
      mat4.translate(0, drift, 0),
      mat4.mul(mat4.rotX(tiltX), mat4.mul(mat4.rotZ(roll), mat4.mul(mat4.rotY(spinY), fit)))
    );
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uni.model, false, modelM);
    gl.uniformMatrix4fv(uni.viewProj, false, viewProj);
    gl.uniformMatrix3fv(uni.normalMat, false, mat4.normal3(modelM));
    gl.drawElements(gl.TRIANGLES, indexCount, indexType, 0);

    if (shadow) {
      const lift = clamp(0.5 + drift);
      shadow.style.transform = `translateX(-50%) scale(${(1.08 - lift * 0.35).toFixed(3)})`;
      shadow.style.opacity = (0.85 - lift * 0.45).toFixed(3);
    }
  };

  const tick = (time) => {
    raf = 0;
    if (!visible) return;
    current.p = reduced ? target.p : lerp(current.p, target.p, 0.09);
    draw(time);
    const settling = Math.abs(current.p - target.p) > 0.0005;
    if (!reduced || settling || needsDraw) {
      needsDraw = false;
      if (!reduced) raf = requestAnimationFrame(tick); // idle bob keeps it alive
    }
  };
  const kick = () => {
    if (!raf && visible) raf = requestAnimationFrame(tick);
  };

  if (!reduced) {
    onScroll(() => {
      const r = zone.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 as the zone enters from below, 1 as it leaves through the top.
      target.p = clamp((vh - r.top) / (r.height + vh));
      kick();
    });
  } else {
    target.p = current.p = 0.42; // a static three-quarter view
  }

  new ResizeObserver(() => {
    resize();
    if (reduced) {
      visible = true;
      draw(0);
    } else kick();
  }).observe(canvas);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    kick();
  }).observe(stage);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stage.classList.add('is-failed');
  });

  resize();
  stage.classList.add('is-ready');
}
