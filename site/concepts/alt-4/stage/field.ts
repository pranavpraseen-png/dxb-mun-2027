// The floor: about 13,000 lit bars on a grid, drawn as one instanced draw call.
// Every bar's height is computed on the GPU from a few uniforms (time, hold, shockwave, letters, pointer, taps),
// so the CPU only moves the camera. Flat faces, hard edges, no post-processing: crisp at any DPR up to 2.
import * as THREE from 'three';
import type { Grid } from './textmap';

const vert = /* glsl */ `
  uniform float uTime, uHold, uImpact, uRiseT, uSink, uBar, uFlash, uPtrAmp;
  uniform vec2 uPtr;
  uniform vec4 uTaps[4];
  attribute vec3 aCell; // x, z, letter
  varying vec3 vN; varying vec2 vUv; varying float vH, vLetter, vRing, vDepth, vHold;

  void main() {
    vec2 p = aCell.xy;
    float d = length(p);
    float h = 0.04 + 0.035 * (0.5 + 0.5 * sin(p.x * 0.8 + uTime * 0.6) * sin(p.y * 1.05 - uTime * 0.45));

    // Hold: the room leans in. Rings travel inward, faster and taller as the hold builds.
    float hh = uHold * uHold;
    h += hh * (0.5 + 0.5 * sin(d * 2.1 + uTime * (3.0 + 9.0 * uHold))) * 1.05 * exp(-d * 0.09);
    h += hh * 0.25 * (0.5 + 0.5 * sin(p.x * 3.1 + uTime * 7.0) * sin(p.y * 2.7 - uTime * 6.0));

    // The gavel's shockwave: one hard ring racing outward, decaying.
    float ring = 0.0;
    if (uImpact >= 0.0) {
      float r = uImpact * 15.0;
      float w = 0.55 + uImpact * 0.9;
      ring = exp(-pow((d - r) / w, 2.0)) * exp(-uImpact * 0.75);
      h += ring * 2.6;
      h += exp(-uImpact * 7.0) * 0.9 * exp(-d * 0.15); // the slam: everything jumps on the hit frame
    }

    // Letters erupt behind the shockwave: each bar springs up (hard overshoot) the moment the wave front reaches it.
    float rise = 0.0;
    float tl = uRiseT - d / 15.0;
    if (tl > 0.0) rise = 1.0 - exp(-4.2 * tl) * (cos(13.0 * tl) + (4.2 / 13.0) * sin(13.0 * tl));
    h += aCell.z * rise * 2.1;
    // ...and once risen they stay alive: a slow swell rolls through the wordmark, left to right.
    h += aCell.z * clamp(rise, 0.0, 1.0) * 0.24 * (0.5 + 0.5 * sin(p.x * 0.5 - uTime * 1.3 + p.y * 0.15));

    // Pointer: a soft hill follows the cursor.
    vec2 dp = p - uPtr;
    h += uPtrAmp * exp(-dot(dp, dp) * 0.32) * 0.75;

    // Taps: rings from clicks and from charged holds on the floor (bigger amp = bigger, faster, orange ring).
    for (int i = 0; i < 4; i++) {
      vec4 t = uTaps[i];
      float tt = uTime - t.z;
      if (tt > 0.0 && tt < 3.5) {
        float dd = length(p - t.xy);
        float tr = t.w * exp(-pow((dd - tt * (6.0 + 3.0 * t.w)) / (0.4 + 0.15 * t.w), 2.0)) * exp(-tt * 1.3);
        h += tr * 0.8;
        ring = max(ring, tr * 0.45 * smoothstep(0.8, 1.6, t.w));
      }
    }

    // Scrolling away: the floor sits down in a wave from left to right, like a chamber taking its seats.
    float sk = clamp(uSink * 1.8 - (clamp(p.x * 0.03, -0.5, 0.5) + 0.5) * 0.8, 0.0, 1.0);
    h *= 1.0 - sk * 0.92;
    h = max(h, 0.012);

    vec3 world = vec3(p.x + position.x * uBar, position.y * h, p.y + position.z * uBar);
    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mv;
    vN = normal; vUv = uv; vH = h; vLetter = aCell.z * clamp(rise, 0.0, 1.0); vRing = ring; vDepth = -mv.z; vHold = uHold;
  }
`;

const frag = /* glsl */ `
  uniform vec3 uGround, uLow, uHigh, uInk, uUn, uSignal;
  uniform float uFlash, uSink, uFogNear, uFogFar;
  varying vec3 vN; varying vec2 vUv; varying float vH, vLetter, vRing, vDepth, vHold;

  void main() {
    float lift = smoothstep(0.05, 0.9, vH);
    vec3 top = mix(uLow, uHigh, lift);
    top = mix(top, uUn, clamp(vHold * lift * 1.2, 0.0, 1.0));
    float letter = clamp(vLetter, 0.0, 1.0);
    top = mix(top, uInk, letter);
    vec3 side = top * 0.34;
    side = mix(side, uUn * 0.62, letter);
    side *= 0.82 + 0.18 * abs(vN.x);

    vec3 col = vN.y > 0.5 ? top : side;
    // A hairline on each top face edge: the line layer that keeps the floor crisp.
    if (vN.y > 0.5) {
      float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
      float aa = fwidth(e) * 1.2;
      float line = 1.0 - smoothstep(0.06 - aa, 0.06 + aa, e);
      col = mix(col, mix(uHigh, uInk, 0.5 + 0.5 * letter), line * (0.35 + 0.4 * lift));
    }
    col = mix(col, uSignal, clamp(vRing * 1.4, 0.0, 1.0) * (vN.y > 0.5 ? 1.0 : 0.7));
    col = mix(col, uInk, uFlash * (vN.y > 0.5 ? 1.0 : 0.6));
    col = mix(col, uGround, uSink * 0.55);
    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    gl_FragColor = vec4(mix(col, uGround, fog), 1.0);
  }
`;

const C = (hex: string) => new THREE.Color(hex);

/** shift: slide the picture sideways as a fraction of the screen width (a lens shift, no change of perspective). */
export type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; shift?: number };

export class Field {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
  mesh: THREE.Mesh | null = null;
  uniforms = {
    uTime: { value: 0 }, uHold: { value: 0 }, uImpact: { value: -1 }, uRiseT: { value: -1 }, uSink: { value: 0 },
    uBar: { value: 0.16 }, uFlash: { value: 0 }, uPtrAmp: { value: 0 }, uPtr: { value: new THREE.Vector2(99, 99) },
    uTaps: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, -99, 0)) },
    uGround: { value: C('#03060C') }, uLow: { value: C('#0B1828') }, uHigh: { value: C('#2C5D86') },
    uInk: { value: C('#F2F5F9') }, uUn: { value: C('#009EDB') }, uSignal: { value: C('#E5591C') },
    uFogNear: { value: 14 }, uFogFar: { value: 46 },
  };
  grid: Grid | null = null;
  private tapIndex = 0;
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private ray = new THREE.Raycaster();

  constructor(canvas: HTMLCanvasElement, keepBuffer: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: keepBuffer });
    this.renderer.setClearColor('#03060C', 1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // colours are authored in sRGB and shaded flat
  }

  build(g: Grid, mask: Float32Array) {
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
    this.grid = g;
    const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = box.index;
    geo.setAttribute('position', box.getAttribute('position'));
    geo.setAttribute('normal', box.getAttribute('normal'));
    geo.setAttribute('uv', box.getAttribute('uv'));
    const n = g.cols * g.rows;
    const cells = new Float32Array(n * 3);
    for (let r = 0; r < g.rows; r++) for (let q = 0; q < g.cols; q++) {
      const i = r * g.cols + q;
      cells[i * 3] = (q - (g.cols - 1) / 2) * g.cell;
      cells[i * 3 + 1] = (r - (g.rows - 1) / 2) * g.cell;
      cells[i * 3 + 2] = mask[i];
    }
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 3));
    geo.instanceCount = n;
    this.uniforms.uBar.value = g.cell * 0.72;
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  resize(w: number, h: number, dpr: number) {
    this.renderer.setPixelRatio(Math.min(dpr, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Where a screen point (NDC) lands on the floor. */
  pick(nx: number, ny: number, out: THREE.Vector2) {
    this.ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const hit = new THREE.Vector3();
    if (this.ray.ray.intersectPlane(this.plane, hit)) out.set(hit.x, hit.z);
    return out;
  }

  addTap(x: number, z: number, t: number, amp: number) {
    this.uniforms.uTaps.value[this.tapIndex++ % 4].set(x, z, t, amp);
  }

  render(pose: Pose, roll = 0) {
    this.camera.position.copy(pose.pos);
    // filmOffset moves the frustum's left edge by near*offset/filmWidth; the full width is 2*near*tan(fov/2)*aspect.
    const c = this.camera;
    const off = -(pose.shift ?? 0) * 2 * Math.tan((pose.fov * Math.PI) / 360) * c.aspect * c.getFilmWidth();
    if (c.fov !== pose.fov || c.filmOffset !== off) { c.fov = pose.fov; c.filmOffset = off; c.updateProjectionMatrix(); }
    this.camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    this.camera.lookAt(pose.target);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.mesh?.geometry.dispose();
    (this.mesh?.material as THREE.Material | undefined)?.dispose();
    this.renderer.dispose();
  }
}

export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
