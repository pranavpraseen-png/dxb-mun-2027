// Live 05 · A full-bleed GLSL sky (React Three Fiber, one fragment shader on a screen quad). Scroll sinks the sun
// into the Gulf and blends the dusk palette into the night palette. frameloop="demand": a frame is drawn only when
// the scroll position changes, so the canvas is idle off screen. Opaque colours only; the sun edge is a
// one-device-pixel antialias (fwidth), with no bloom and no grain.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Demo, STILL } from './kit';

gsap.registerPlugin(ScrollTrigger);

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Colours are the Dubai Dusk tokens, written as sRGB 0..255 (the canvas is "flat linear", so no conversion).
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uP;
uniform float uAspect;
vec3 c(float r, float g, float b) { return vec3(r, g, b) / 255.0; }
float aaStep(float edge, float x) { float w = fwidth(x); return smoothstep(edge - w, edge + w, x); }
void main() {
  float p = uP;
  float hz = 0.34;                       // horizon height (of the stage)
  vec2 uv = vUv;

  // Sky: horizon -> zenith, dusk (p = 0) blended to night (p = 1).
  float t = clamp((uv.y - hz) / (1.0 - hz), 0.0, 1.0);
  vec3 dHor = c(221., 137., 100.), dMid = c(110., 40., 38.), dZen = c(11., 32., 39.);   // accent, maroon, surface
  vec3 nHor = c(40., 65., 75.),    nMid = c(22., 44., 52.),  nZen = c(5., 22., 29.);    // line, raised, ground
  vec3 dusk = mix(mix(dHor, dMid, smoothstep(0.0, 0.42, t)), dZen, smoothstep(0.3, 1.0, t));
  vec3 night = mix(mix(nHor, nMid, smoothstep(0.0, 0.42, t)), nZen, smoothstep(0.3, 1.0, t));
  vec3 sky = mix(dusk, night, smoothstep(0.15, 0.95, p));

  // Sun: a crisp disc that sinks below the horizon.
  vec2 sp = vec2(0.62, hz + 0.2 - 0.3 * p);
  vec2 d = (uv - sp) * vec2(uAspect, 1.0);
  float r = 0.085;
  float disc = 1.0 - aaStep(r, length(d));
  vec3 sunCol = mix(c(226., 201., 180.), c(233., 180., 82.), p);       // cream -> gold as it sets
  float above = aaStep(hz, uv.y);
  vec3 col = mix(sky, sunCol, disc * above);

  // Sea: a darker band with the sun's reflection as crisp horizontal rules.
  if (uv.y < hz) {
    float depth = (hz - uv.y) / hz;                                    // 0 at horizon, 1 at bottom
    vec3 sea = mix(mix(c(22., 44., 52.), c(110., 40., 38.), 0.35 * (1.0 - p)), c(5., 22., 29.), smoothstep(0.0, 1.0, depth));
    float colW = (0.05 + 0.12 * depth) * (1.0 - 0.7 * p);
    float inCol = 1.0 - aaStep(colW, abs((uv.x - sp.x) * uAspect));
    float rules = aaStep(0.55, fract(depth * 46.0 * (1.0 + depth)));
    float glint = inCol * rules * (1.0 - smoothstep(0.55, 1.0, p)) * (1.0 - depth * 0.6);
    col = mix(sea, sunCol, glint * 0.9);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

function Sky({ p }: { p: { current: number } }) {
  const mat = useRef<{ uniforms: Record<string, { value: number }> }>(null);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const uniforms = useMemo(() => ({ uP: { value: p.current }, uAspect: { value: 1 } }), [p]);
  useEffect(() => {
    const on = () => invalidate();
    window.addEventListener('dusk:p', on);
    return () => window.removeEventListener('dusk:p', on);
  }, [invalidate]);
  useFrame(() => {
    if (!mat.current) return;
    mat.current.uniforms.uP.value = p.current;
    mat.current.uniforms.uAspect.value = size.width / Math.max(1, size.height);
  });
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat as never} vertexShader={vert} fragmentShader={frag} depthTest={false} depthWrite={false} uniforms={uniforms} />
    </mesh>
  );
}

// A plain skyline silhouette on the horizon (vector, ground colour): towers and one tall stepped spire.
// The viewBox stops at y 236, the towers' base line, so they rise straight off the shader's horizon.
function Skyline() {
  return (
    <svg className="skyline" viewBox="0 0 1440 236" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path fill="currentColor" d="M0 300V236h60v-30h44v30h30v-58h52v58h24v-40h40v40h36v-84h46v84h30v-52h38v52h40v-110h18v-20h20v20h14v110h44v-62h50v62h32v-36h36v36h60
        v-70l8-5v-16h5v-28h4v-30h3v-24h2v-30h2v30h2v24h3v30h4v28h5v16l8 5v70h40v-70h44v70h34v-128l26-18 26 18v128h38v-50h40v50h40v-86h48v86h34v-44h50v44h38v-66h44v66h54v-30h60v30H1440V300z" />
    </svg>
  );
}

export function DuskSky() {
  const track = useRef<HTMLDivElement>(null);
  const p = useRef(STILL ? 0.35 : 0);

  useEffect(() => {
    if (STILL) return;
    const st = ScrollTrigger.create({
      trigger: track.current, start: 'top top', end: 'bottom bottom', scrub: 0.8,
      onUpdate: (s) => { p.current = s.progress; window.dispatchEvent(new Event('dusk:p')); },
    });
    return () => st.kill();
  }, []);

  return (
    <Demo id="demo-dusk" n={5} className="is-track" likeLabel="Shader dusk sky"
      title="A dusk sky that sets as you scroll"
      caption="One fragment shader. The sun sinks into the Gulf; the sea-blue night takes over."
      credit={[{ label: 'React Three Fiber', url: 'https://r3f.docs.pmnd.rs/' }, { label: 'three.js', url: 'https://threejs.org/' }, { label: 'Paper Shaders (approach)', url: 'https://shaders.paper.design/' }]}>
      <div ref={track} className="track track-dusk">
        <div className="sticky dusk-stage">
          <Canvas className="dusk-canvas" dpr={[1, 2]} frameloop="demand" flat linear gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }} orthographic>
            <Sky p={p} />
          </Canvas>
          <Skyline />
          <div className="dusk-copy">
            <p className="dusk-kicker">DXB MUN 2027 · Dubai</p>
            <p className="dusk-motto"><em>Diplomacy</em> around us.</p>
          </div>
        </div>
      </div>
    </Demo>
  );
}
