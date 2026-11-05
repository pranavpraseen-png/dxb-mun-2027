// World 1: deep space and the globe. Land is drawn as sand dots; Dubai carries a thin terracotta beam the camera dives down.
// Raw shaders end in <colorspace_fragment> so the Dusk hex colours land exactly on screen (sRGB output).
// Dusk theme: no atmosphere halo (it was an additive glow), hard-edged dots, opaque graticule, a solid beam.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DUBAI, landPositions, latLon, RAD } from './layout';
import { frame } from './frame';
import { rig } from './store';
import { SCENE } from './theme';

const SPIN = 790 * RAD; // how far the globe turns on the way in (lands on Africa and Europe at the About stop)

const dotVert = /* glsl */ `
  uniform float uSize; uniform float uPix;
  varying float vFace; varying float vPx;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * position);
    vFace = dot(n, normalize(-mv.xyz));
    gl_PointSize = min(48.0, uSize * uPix / -mv.z);
    vPx = max(gl_PointSize, 1.0);
    gl_Position = projectionMatrix * mv;
  }`;
const dotFrag = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uHi; uniform float uDim;
  varying float vFace; varying float vPx;
  void main() {
    vec2 c = gl_PointCoord - 0.5; float d = length(c);
    if (d > 0.5 || vFace < 0.0) discard;
    float aa = 1.0 / vPx; // one device pixel of edge antialiasing, nothing softer
    float a = 1.0 - smoothstep(0.5 - aa, 0.5, d);
    if (a <= 0.0 || vFace < 0.12) discard;
    gl_FragColor = vec4(mix(uColor, uHi, pow(vFace, 4.0)) * uDim, a);
    #include <colorspace_fragment>
  }`;
const rimVert = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const oceanFrag = /* glsl */ `
  uniform vec3 uDeep; uniform vec3 uRim; uniform float uDim;
  varying vec3 vN; varying vec3 vV;
  void main() {
    float f = 1.0 - max(dot(vN, vV), 0.0);
    gl_FragColor = vec4(mix(uDeep, uRim, pow(f, 2.6)) * uDim, 1.0);
    #include <colorspace_fragment>
  }`;
const beamVert = /* glsl */ `
  varying float vY;
  void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const beamFrag = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uDash; uniform float uTime; uniform float uDim;
  varying float vY;
  void main() {
    // a solid line with one sharp sand dash running up it (no glow, no fade)
    float k = fract(vY * 3.0 - uTime * 0.6);
    vec3 c = k < 0.18 ? uDash : uColor;
    gl_FragColor = vec4(c * uDim, 1.0);
    #include <colorspace_fragment>
  }`;

function graticule() {
  const pts: number[] = [];
  const push = (a: [number, number, number], b: [number, number, number]) => pts.push(...a, ...b);
  for (let lat = -60; lat <= 60; lat += 30) for (let lon = -180; lon < 180; lon += 4) push(latLon(lat, lon, 1.002), latLon(lat, lon + 4, 1.002));
  for (let lon = -180; lon < 180; lon += 30) for (let lat = -88; lat < 88; lat += 4) push(latLon(lat, lon, 1.002), latLon(lat + 4, lon, 1.002));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

export function Space() {
  const lite = rig.lite;
  const spin = useRef<THREE.Group>(null);
  const label = useRef<HTMLElement | null>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const ring = useRef<THREE.Mesh>(null);

  const land = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(landPositions(lite ? 9000 : 17000), 3));
    return g;
  }, [lite]);
  const grat = useMemo(graticule, []);

  const u = useMemo(() => ({
    dots: { uSize: { value: lite ? 0.024 : 0.017 }, uPix: { value: 500 }, uColor: { value: new THREE.Color(SCENE.land) }, uHi: { value: new THREE.Color(SCENE.landHi) }, uDim: { value: 1 } },
    ocean: { uDeep: { value: new THREE.Color(SCENE.oceanDeep) }, uRim: { value: new THREE.Color(SCENE.oceanRim) }, uDim: { value: 1 } },
    beam: { uColor: { value: new THREE.Color(SCENE.beam) }, uDash: { value: new THREE.Color(SCENE.beamDash) }, uTime: { value: 0 }, uDim: { value: 1 } },
  }), [lite]);

  // Dubai's frame on the sphere: the beam and ring stand on the local normal.
  const dubai = useMemo(() => {
    const p = new THREE.Vector3(...latLon(DUBAI.lat, DUBAI.lon, 1));
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
    const qz = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize());
    return { p, q, qz };
  }, []);

  useFrame((state) => {
    const f = frame.pose;
    const e = f.spin < 0.5 ? 4 * f.spin ** 3 : 1 - Math.pow(-2 * f.spin + 2, 3) / 2;
    const idle = (1 - Math.min(1, f.spin * 2.5)) * state.clock.elapsedTime * 0.04;
    if (spin.current) {
      spin.current.rotation.set(DUBAI.lat * RAD * e, -DUBAI.lon * RAD + SPIN * (1 - e) + idle, 0, 'XYZ');
    }
    const dim = 1 - Math.min(1, f.fog / 6);
    u.dots.uDim.value = u.ocean.uDim.value = u.beam.uDim.value = dim;
    const cam = state.camera as THREE.PerspectiveCamera;
    u.dots.uPix.value = state.size.height * state.viewport.dpr / (2 * Math.tan((cam.fov * RAD) / 2));
    u.beam.uTime.value = state.clock.elapsedTime;
    if (ring.current) {
      const k = (state.clock.elapsedTime * 0.6) % 1;
      ring.current.scale.setScalar(0.6 + k * 2.2);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9 * dim;
    }
    // the Dubai tag is plain DOM (in Home.tsx), pinned here to the projected point
    label.current ??= document.getElementById('where');
    const tag = label.current;
    if (tag && spin.current) {
      const near = f.world === 'space' ? Math.max(0, 1 - Math.abs(rig.t - 2) / 0.35) : 0;
      tmp.copy(dubai.p).multiplyScalar(1.01).applyMatrix4(spin.current.matrixWorld).project(cam);
      const x = (tmp.x * 0.5 + 0.5) * state.size.width, y = (-tmp.y * 0.5 + 0.5) * state.size.height;
      tag.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      tag.style.opacity = near.toFixed(3);
    }
  });

  return (
    <group name="world-space">
      <group ref={spin}>
        <mesh>
          <sphereGeometry args={[1, lite ? 40 : 72, lite ? 28 : 48]} />
          <shaderMaterial vertexShader={rimVert} fragmentShader={oceanFrag} uniforms={u.ocean} />
        </mesh>
        <lineSegments geometry={grat}>
          <lineBasicMaterial color={SCENE.graticule} />
        </lineSegments>
        <points geometry={land}>
          <shaderMaterial vertexShader={dotVert} fragmentShader={dotFrag} uniforms={u.dots} transparent depthWrite={false} />
        </points>
        {/* Dubai: terracotta pin, pulse ring and the beam the camera dives down */}
        <group position={dubai.p} quaternion={dubai.q}>
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.64, 8, 1, true]} />
            <shaderMaterial vertexShader={beamVert} fragmentShader={beamFrag} uniforms={u.beam} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.009, 12, 8]} />
            <meshBasicMaterial color={SCENE.pin} toneMapped={false} />
          </mesh>
        </group>
        <mesh ref={ring} position={dubai.p.clone().multiplyScalar(1.003)} quaternion={dubai.qz}>
          <ringGeometry args={[0.012, 0.015, 48]} />
          <meshBasicMaterial color={SCENE.pin} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
