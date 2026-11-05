// Live 06 · The event photo on a WebGL plane. Pointer velocity smears the texture locally (the Codrops "stretch"
// hover); the velocity decays on a spring, and at rest the shader is the identity, so the photo shows at exact
// pixels. frameloop="demand": frames are drawn only while the smear is settling.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { LinearFilter, TextureLoader, type Texture } from 'three';
import { heroPhoto } from '@/data/conference';
import { Demo, STILL } from './kit';

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uAspect;
void main() {
  vec2 d = (vUv - uMouse) * vec2(uAspect, 1.0);
  float fall = exp(-dot(d, d) / 0.05);
  vec2 uv = vUv - uVel * fall;
  gl_FragColor = texture2D(uTex, clamp(uv, 0.0, 1.0));
}
`;

type Ptr = { x: number; y: number; vx: number; vy: number; t: number };

function Plane({ ptr }: { ptr: { current: Ptr } }) {
  const tex = useLoader(TextureLoader, heroPhoto.src) as Texture;
  useMemo(() => { tex.minFilter = LinearFilter; tex.magFilter = LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true; }, [tex]);
  const mat = useRef<{ uniforms: Record<string, { value: unknown }> }>(null);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const vel = useRef({ x: 0, y: 0 });
  const uniforms = useMemo(() => ({ uTex: { value: tex }, uMouse: { value: [0.5, 0.5] }, uVel: { value: [0, 0] }, uAspect: { value: 1.5 } }), [tex]);

  useEffect(() => {
    const on = () => invalidate();
    window.addEventListener('photo:move', on);
    return () => window.removeEventListener('photo:move', on);
  }, [invalidate]);

  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 9);
    const p = ptr.current;
    // Target velocity decays to 0 shortly after the pointer stops.
    const age = performance.now() - p.t;
    const tx = age < 60 ? p.vx : 0, ty = age < 60 ? p.vy : 0;
    vel.current.x += (tx - vel.current.x) * k;
    vel.current.y += (ty - vel.current.y) * k;
    const still = Math.abs(vel.current.x) < 2e-5 && Math.abs(vel.current.y) < 2e-5 && age > 60;
    if (still) { vel.current.x = 0; vel.current.y = 0; }
    m.uniforms.uMouse.value = [p.x, p.y];
    m.uniforms.uVel.value = [vel.current.x, vel.current.y];
    m.uniforms.uAspect.value = size.width / Math.max(1, size.height);
    if (!still) invalidate();
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat as never} vertexShader={vert} fragmentShader={frag} depthTest={false} depthWrite={false} uniforms={uniforms} />
    </mesh>
  );
}

export function PhotoDistort() {
  const ptr = useRef<Ptr>({ x: 0.5, y: 0.5, vx: 0, vy: 0, t: 0 });
  const box = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
    const p = ptr.current, now = performance.now();
    const dt = Math.max(8, now - p.t);
    if (now - p.t < 120) {
      // Velocity in UV per ~frame, capped so a fast flick never tears the photo.
      const cap = 0.1;
      p.vx = Math.max(-cap, Math.min(cap, ((x - p.x) / dt) * 16 * 3.5));
      p.vy = Math.max(-cap, Math.min(cap, ((y - p.y) / dt) * 16 * 3.5));
    }
    p.x = x; p.y = y; p.t = now;
    window.dispatchEvent(new Event('photo:move'));
  };

  return (
    <Demo id="demo-photo" n={6} likeLabel="Photo stretch on hover"
      title="The photo stretches with your hand"
      caption="Move across the photo. It smears with the cursor, then settles back to exact pixels."
      credit={[{ label: 'Codrops: image distortion hovers', url: 'https://tympanus.net/codrops/2019/10/21/how-to-create-motion-hover-effects-with-image-distortions-using-three-js/' }, { label: 'three.js + R3F', url: 'https://r3f.docs.pmnd.rs/' }]}>
      <figure className="photo">
        <div ref={box} className="photo-frame" onPointerMove={STILL ? undefined : onMove} style={{ aspectRatio: `${heroPhoto.width} / ${heroPhoto.height}` }}>
          <img src={heroPhoto.src} width={heroPhoto.width} height={heroPhoto.height} alt={heroPhoto.alt} decoding="async" />
          {!STILL && (
            <Canvas className="photo-canvas" dpr={[1, 2]} frameloop="demand" flat linear gl={{ antialias: false, alpha: false }} orthographic>
              <Suspense fallback={null}><Plane ptr={ptr} /></Suspense>
            </Canvas>
          )}
        </div>
        <figcaption><span>{heroPhoto.alt}.</span><span className="mono">2000 × 1333 · shown at ≤ 1000 px</span></figcaption>
      </figure>
    </Demo>
  );
}
