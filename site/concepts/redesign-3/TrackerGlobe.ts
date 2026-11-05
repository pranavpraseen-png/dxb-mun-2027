// The tracking map: a Three.js globe of land dots that searches, then locks onto Dubai.
// One renderer, one scene. It renders only while on screen and the tab is visible, renders at min(devicePixelRatio, 2) on
// every device (phones stay light through fewer dots and no MSAA, never a lower resolution), and draws a single
// frame in still mode. The caller supplies the target pose every frame (from scroll); the globe eases toward it and reports
// the pose and Dubai's screen position back, so the DOM HUD and reticle stay glued to the same pixel.
import * as THREE from 'three';
import { LAND_MASK_B64 } from './landmask';
import { DUBAI } from './data';
import { DUSK } from './theme';

export type Pose = { lat: number; lon: number; dist: number };
export type FrameInfo = { pose: Pose; x: number; y: number; facing: boolean; w: number; h: number };

const RAD = Math.PI / 180;

function landLattice(samples: number) {
  const bin = atob(LAND_MASK_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const bit = (x: number, y: number) => {
    const i = y * 256 + x;
    return (bytes[i >> 3] >> (7 - (i & 7))) & 1;
  };
  const out: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < samples; i++) {
    const y = 1 - (2 * (i + 0.5)) / samples;
    const lat = Math.asin(y);
    const lon = ((i * golden) % (2 * Math.PI)) - Math.PI;
    const u = Math.floor(((lon / Math.PI + 1) / 2) * 256) & 255;
    const v = Math.min(127, Math.max(0, Math.floor(((Math.PI / 2 - lat) / Math.PI) * 128)));
    if (bit(u, v)) out.push(...xyz(lat, lon, 1));
  }
  return new Float32Array(out);
}

/** lat/lon (radians) to a point on a sphere of radius r, three.js axes (y up, lon 0 on +x, east toward -z). */
function xyz(lat: number, lon: number, r: number): [number, number, number] {
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lon)];
}

const DOT_VERT = /* glsl */ `
  uniform float uSize;
  uniform float uPx;
  varying float vFace;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * position);
    vec3 toCam = normalize(-mv.xyz);
    vFace = dot(n, toCam);
    gl_PointSize = uSize * uPx * (3.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const DOT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uNear;
  uniform vec3 uOcean;
  uniform float uLock;
  varying float vFace;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    // Opaque dots: toward the limb they shade into the ocean colour instead of fading out with alpha.
    vec3 col = mix(uColor, uNear, uLock * smoothstep(0.92, 1.0, vFace));
    gl_FragColor = vec4(mix(uOcean, col, smoothstep(0.0, 0.45, vFace)), 1.0);
  }
`;

export class TrackerGlobe {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  private tilt = new THREE.Group();
  private spin = new THREE.Group();
  private limb: THREE.Mesh;
  private ring: THREE.Mesh;
  private dotMat: THREE.ShaderMaterial;
  private marker = new THREE.Vector3();
  private pose: Pose;
  private raf = 0;
  private visible = true;
  private alive = true;
  private io: IntersectionObserver;
  private ro: ResizeObserver;
  private w = 1;
  private h = 1;
  private last = performance.now();
  private readonly onVis = () => this.kick();

  constructor(
    private host: HTMLElement,
    private target: () => Pose,
    private onFrame: (f: FrameInfo) => void,
    private still = false,
    private lost?: () => void,
  ) {
    const small = Math.min(innerWidth, innerHeight) < 600;
    this.renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: still });
    // Full device resolution (capped at 2) on every device: the backing store is CSS size x this ratio (see resize()).
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setClearColor(DUSK.ground, 0); // clear to nothing: the map's 1px grid shows around the globe
    const canvas = this.renderer.domElement;
    canvas.className = 'trk-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost?.(); });

    this.scene.add(this.tilt);
    this.tilt.add(this.spin);

    // Ocean: a dark sphere that also hides the far side of the dots (depth).
    const ocean = new THREE.Mesh(
      new THREE.SphereGeometry(0.992, small ? 48 : 72, small ? 32 : 48),
      new THREE.MeshBasicMaterial({ color: DUSK.surface }),
    );
    this.spin.add(ocean);

    // Land dots.
    const pts = new THREE.BufferGeometry();
    pts.setAttribute('position', new THREE.BufferAttribute(landLattice(small ? 26000 : 42000), 3));
    this.dotMat = new THREE.ShaderMaterial({
      vertexShader: DOT_VERT,
      fragmentShader: DOT_FRAG,
      depthWrite: false,
      uniforms: {
        uSize: { value: small ? 2.6 : 3.0 },
        uPx: { value: this.renderer.getPixelRatio() },
        uColor: { value: new THREE.Color(DUSK.muted) },
        uNear: { value: new THREE.Color(DUSK.accent) },
        uOcean: { value: new THREE.Color(DUSK.surface) },
        uLock: { value: 0 },
      },
    });
    this.spin.add(new THREE.Points(pts, this.dotMat));

    // Graticule every 15° of latitude and 30° of longitude, plus Dubai's own parallel and meridian in terracotta. All lines opaque.
    const grid: number[] = [];
    const line = (fn: (t: number) => [number, number, number], steps = 160) => {
      for (let i = 0; i < steps; i++) grid.push(...fn(i / steps), ...fn((i + 1) / steps));
    };
    for (let lat = -75; lat <= 75; lat += 15) line((t) => xyz(lat * RAD, (t * 360 - 180) * RAD, 1.002));
    for (let lon = -180; lon < 180; lon += 30) line((t) => xyz((t * 180 - 90) * RAD, lon * RAD, 1.002));
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
    this.spin.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: DUSK.line })));

    const cross: number[] = [];
    const lineC = (fn: (t: number) => [number, number, number], steps = 240) => {
      for (let i = 0; i < steps; i++) cross.push(...fn(i / steps), ...fn((i + 1) / steps));
    };
    lineC((t) => xyz(DUBAI.lat * RAD, (t * 360 - 180) * RAD, 1.004));
    lineC((t) => xyz((t * 180 - 90) * RAD, DUBAI.lon * RAD, 1.004));
    const crossGeo = new THREE.BufferGeometry();
    crossGeo.setAttribute('position', new THREE.Float32BufferAttribute(cross, 3));
    this.spin.add(new THREE.LineSegments(crossGeo, new THREE.LineBasicMaterial({ color: DUSK.accent })));

    // Dubai: a sand pip and a pulse ring lying on the surface (the ring fades only as it expands: motion, not a wash).
    const [mx, my, mz] = xyz(DUBAI.lat * RAD, DUBAI.lon * RAD, 1.006);
    this.marker.set(mx, my, mz);
    const pip = new THREE.Mesh(new THREE.CircleGeometry(0.008, 24), new THREE.MeshBasicMaterial({ color: DUSK.action }));
    pip.position.copy(this.marker);
    pip.lookAt(this.marker.clone().multiplyScalar(2));
    this.spin.add(pip);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.022, 0.025, 48),
      new THREE.MeshBasicMaterial({ color: DUSK.action, transparent: true, opacity: 1, side: THREE.DoubleSide }),
    );
    this.ring.position.copy(this.marker);
    this.ring.lookAt(this.marker.clone().multiplyScalar(2));
    this.spin.add(this.ring);

    // The limb: a thin ring exactly on the silhouette (it faces the camera and is re-fitted to the distance each frame).
    this.limb = new THREE.Mesh(
      new THREE.RingGeometry(0.997, 1.0, 160),
      new THREE.MeshBasicMaterial({ color: DUSK.line, depthTest: false }),
    );
    this.limb.renderOrder = 10; // opaque now, so draw it after the ocean explicitly
    this.scene.add(this.limb);

    this.pose = { ...target() };

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();

    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.kick();
    });
    this.io.observe(host);
    document.addEventListener('visibilitychange', this.onVis);
    this.kick();
  }

  private resize() {
    this.w = Math.max(1, this.host.clientWidth);
    this.h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    // Keep the whole globe in frame on tall, narrow stages: widen the vertical FOV when the stage is portrait.
    this.camera.fov = this.w < this.h ? 30 / Math.max(0.55, this.w / this.h) : 30;
    this.camera.updateProjectionMatrix();
    this.draw(0, true);
  }

  private kick() {
    if (!this.alive || this.raf || this.still) {
      if (this.still) this.draw(0, true);
      return;
    }
    if (this.visible && !document.hidden) this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    this.raf = 0;
    if (!this.alive || !this.visible || document.hidden) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.draw(dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw(dt: number, snap = false) {
    const t = this.target();
    if (snap || this.still) this.pose = { ...t };
    else {
      const k = 1 - Math.exp(-dt / 0.35);
      this.pose.lat += (t.lat - this.pose.lat) * k;
      this.pose.lon += (t.lon - this.pose.lon) * k;
      this.pose.dist += (t.dist - this.pose.dist) * k;
    }
    const { lat, lon, dist } = this.pose;
    this.tilt.rotation.x = lat * RAD;
    this.spin.rotation.y = -Math.PI / 2 - lon * RAD;
    this.camera.position.set(0, 0, dist);
    this.camera.lookAt(0, 0, 0);

    // Fit the limb ring to the silhouette for this distance.
    const zc = 1 / dist;
    const rc = Math.sqrt(Math.max(0, 1 - zc * zc));
    this.limb.position.set(0, 0, zc);
    this.limb.scale.setScalar(rc);

    const locked = Math.abs(lon - DUBAI.lon) < 1.5 && Math.abs(lat - DUBAI.lat) < 1.5 ? 1 : 0;
    const u = this.dotMat.uniforms.uLock;
    u.value += (locked - u.value) * (snap ? 1 : Math.min(1, dt * 4));

    const s = 1 + ((performance.now() / 1400) % 1) * 1.6;
    this.ring.scale.setScalar(this.still ? 1.4 : s);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = this.still ? 1 : 1 - (s - 1) / 1.6;

    this.renderer.render(this.scene, this.camera);

    // Where Dubai lands on screen, and whether it faces us.
    const wp = this.marker.clone().applyMatrix4(this.spin.matrixWorld);
    const facing = wp.clone().normalize().dot(this.camera.position.clone().sub(wp).normalize()) > 0.05;
    const p = wp.project(this.camera);
    this.onFrame({ pose: { ...this.pose }, x: (p.x * 0.5 + 0.5) * this.w, y: (-p.y * 0.5 + 0.5) * this.h, facing, w: this.w, h: this.h });
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};
