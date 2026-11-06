// Takes over the opening canvas's rendering (useFrame priority 1): scene → block-resolution target → Bayer
// two-colour pass with Alt 6's field and lens → whole-block blit to the screen. See bayer.ts for the shaders.
// The lens trail is Alt 6's (gl/field.ts): a 14-point spring chain chasing the pointer or finger, wandering on a
// slow Lissajous path when idle.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BufferGeometry, DataTexture, Float32BufferAttribute, GLSL3, Mesh, NearestFilter, OrthographicCamera, RGBAFormat,
  RawShaderMaterial, Scene, UnsignedByteType, Vector2, WebGLRenderTarget,
} from 'three';
import { LENS_HOME, TRAIL, blitFrag, ditherFrag, drawLayer, grid, quadVert } from './bayer';
import { PHASE_AT, fly, getUi, span } from './clock';

/** Test hook: park the lens at a CSS point inside the opening, and hold it there. */
export const lensCtl = { park: null as null | ((x: number, y: number) => void) };

function quad(mat: RawShaderMaterial) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const m = new Mesh(g, mat);
  m.frustumCulled = false;
  const s = new Scene();
  s.add(m);
  return s;
}

export function Dither() {
  const { gl, size } = useThree();
  const res = useMemo(() => {
    const target = () => new WebGLRenderTarget(1, 1, {
      minFilter: NearestFilter, magFilter: NearestFilter, format: RGBAFormat, type: UnsignedByteType,
      generateMipmaps: false, depthBuffer: true, samples: 0,
    });
    const rtScene = target();
    const rtDither = target();
    rtDither.depthBuffer = false;
    const layerTex = new DataTexture(new Uint8Array(4), 1, 1, RGBAFormat, UnsignedByteType);
    layerTex.minFilter = layerTex.magFilter = NearestFilter;
    layerTex.generateMipmaps = false;
    layerTex.flipY = false;
    layerTex.needsUpdate = true;
    const dither = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: quadVert,
      fragmentShader: ditherFrag,
      depthTest: false, depthWrite: false,
      uniforms: {
        u_scene: { value: rtScene.texture },
        u_layer: { value: layerTex },
        u_res: { value: new Vector2(1, 1) },
        u_time: { value: 0 },
        u_trail: { value: new Float32Array(TRAIL * 3) },
        u_lens: { value: 0 },
        u_field: { value: 0 },
        u_fade: { value: 0 },
      },
    });
    const blit = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: quadVert,
      fragmentShader: blitFrag,
      depthTest: false, depthWrite: false,
      uniforms: { u_tex: { value: rtDither.texture }, u_block: { value: 2 } },
    });
    return { rtScene, rtDither, layerTex, dither, blit, ditherScene: quad(dither), blitScene: quad(blit), cam: new OrthographicCamera() };
  }, []);

  // lens state (texels, y down)
  const lens = useRef({ trail: new Float32Array(TRAIL * 3), target: { x: 0, y: 0, t: -1e9 }, seeded: false, open: 0, hold: false });
  const layerKey = useRef('');

  // resize: block grid from the device pixel ratio; the layer is redrawn at the new size once the fonts are in
  useEffect(() => {
    const pr = gl.getPixelRatio();
    const phone = size.width < 760;
    grid.pr = pr;
    grid.dev = Math.max(1, Math.round(2 * pr));
    grid.css = grid.dev / pr;
    const W = Math.floor(size.width * pr), H = Math.floor(size.height * pr);
    grid.cols = Math.ceil(W / grid.dev);
    grid.rows = Math.ceil(H / grid.dev);
    res.rtScene.setSize(grid.cols, grid.rows);
    res.rtDither.setSize(grid.cols, grid.rows);
    res.dither.uniforms.u_res.value.set(grid.cols, grid.rows);
    res.blit.uniforms.u_block.value = grid.dev;
    const l = lens.current;
    if (!l.seeded) {
      const home = phone ? LENS_HOME.phone : LENS_HOME.wide;
      l.target.x = grid.cols * home.x;
      l.target.y = grid.rows * home.y;
      for (let i = 0; i < TRAIL; i++) { l.trail[i * 3] = l.target.x; l.trail[i * 3 + 1] = l.target.y; }
      l.seeded = true;
    }
    const key = `${grid.cols}x${grid.rows}`;
    let cancelled = false;
    const draw = () => {
      if (cancelled || layerKey.current === key + ':' + document.fonts.status) return;
      layerKey.current = key + ':' + document.fonts.status;
      const data = drawLayer(grid.cols, grid.rows, phone);
      const tex = new DataTexture(data, grid.cols, grid.rows, RGBAFormat, UnsignedByteType);
      tex.minFilter = tex.magFilter = NearestFilter;
      tex.generateMipmaps = false;
      tex.flipY = false;
      tex.needsUpdate = true;
      const old = res.dither.uniforms.u_layer.value as DataTexture;
      res.dither.uniforms.u_layer.value = tex;
      if (old !== res.layerTex) old.dispose();
    };
    const fonts = Promise.all([
      document.fonts.load('800 100px "Mona Sans Variable"'),
      document.fonts.load('italic 400 100px "Instrument Serif"'),
    ]).catch(() => undefined);
    Promise.race([fonts, new Promise((r) => setTimeout(r, 2500))]).then(draw);
    return () => { cancelled = true; layerKey.current = ''; };
  }, [gl, size.width, size.height, res]);

  // pointer and finger
  useEffect(() => {
    const toTexel = (cx: number, cy: number) => {
      const r = gl.domElement.getBoundingClientRect();
      return { x: (cx - r.left) / grid.css, y: (cy - r.top) / grid.css };
    };
    const set = (cx: number, cy: number) => {
      const l = lens.current;
      if (l.hold) return;
      const p = toTexel(cx, cy);
      l.target = { x: p.x, y: p.y, t: performance.now() };
    };
    const onPointer = (e: PointerEvent) => { if (!(e.pointerType === 'touch' && e.type === 'pointermove')) set(e.clientX, e.clientY); };
    const onTouch = (e: TouchEvent) => { const t = e.touches[0]; if (t) set(t.clientX, t.clientY); };
    addEventListener('pointermove', onPointer, { passive: true });
    addEventListener('pointerdown', onPointer, { passive: true });
    addEventListener('touchmove', onTouch, { passive: true });
    addEventListener('touchstart', onTouch, { passive: true });
    lensCtl.park = (x, y) => {
      const l = lens.current;
      l.hold = true;
      l.target = { x: x / grid.css, y: y / grid.css, t: performance.now() + 1e9 };
      for (let i = 0; i < TRAIL; i++) { l.trail[i * 3] = l.target.x; l.trail[i * 3 + 1] = l.target.y; }
    };
    // the screenshot script parks the lens through this
    (window as unknown as { __c2?: { park: (x: number, y: number) => void } }).__c2 = { park: (x, y) => { lensCtl.park?.(x, y); } };
    return () => {
      removeEventListener('pointermove', onPointer);
      removeEventListener('pointerdown', onPointer);
      removeEventListener('touchmove', onTouch);
      removeEventListener('touchstart', onTouch);
      lensCtl.park = null;
    };
  }, [gl]);

  useEffect(() => () => {
    res.rtScene.dispose(); res.rtDither.dispose(); res.layerTex.dispose(); res.dither.dispose(); res.blit.dispose();
    (res.dither.uniforms.u_layer.value as DataTexture).dispose();
  }, [res]);

  useFrame((state, dt) => {
    const { scene, camera, clock } = state;
    const t = clock.elapsedTime;
    const now = performance.now();
    const l = lens.current;
    const { cols, rows } = grid;
    // idle for 2.6 s (or never moved): the lens wanders round the globe on a slow Lissajous path
    if (!l.hold && now - l.target.t > 2600) {
      const phone = cols < rows;
      const home = phone ? LENS_HOME.phone : LENS_HOME.wide;
      l.target.x = cols * (home.x + (phone ? 0.2 : 0.14) * Math.sin(t * 0.37));
      l.target.y = rows * (home.y + (phone ? 0.08 : 0.14) * Math.sin(t * 0.53 + 1.2));
    }
    // head springs to the target, each point follows the one before: a fluid tail (frame-rate independent)
    const R = Math.min(cols, rows) * (cols < rows ? 0.26 : 0.17);
    const f = Math.min(1, dt * 60);
    for (let i = 0; i < TRAIL; i++) {
      const tx = i === 0 ? l.target.x : l.trail[(i - 1) * 3];
      const ty = i === 0 ? l.target.y : l.trail[(i - 1) * 3 + 1];
      const k = 1 - Math.pow(1 - (i === 0 ? 0.22 : 0.42), f);
      l.trail[i * 3] += (tx - l.trail[i * 3]) * k;
      l.trail[i * 3 + 1] += (ty - l.trail[i * 3 + 1]) * k;
      l.trail[i * 3 + 2] = R * (i === 0 ? 0.62 : 0.5 * (1 - (i / TRAIL) * 0.7));
    }
    // the lens opens in six steps when the hero arrives and closes in steps as the flight begins
    const want = getUi().phase >= 3 ? 1 - Math.min(1, Math.max(0, (fly.p - 0.01) / 0.12)) : 0;
    l.open += Math.sign(want - l.open) * Math.min(Math.abs(want - l.open), dt / 0.6);
    const u = res.dither.uniforms;
    (u.u_trail.value as Float32Array).set(l.trail);
    u.u_lens.value = Math.round(l.open * 6) / 6;
    u.u_time.value = t;
    u.u_field.value = span(PHASE_AT[1], PHASE_AT[3] + 0.3);
    u.u_fade.value = Math.min(1, Math.max(0, fly.p / 0.3));

    // A · scene into the block target (alpha 0 where nothing drew)
    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(res.rtScene);
    gl.clear(true, true, false);
    gl.render(scene, camera);
    // B · the two-colour pass
    gl.setRenderTarget(res.rtDither);
    gl.render(res.ditherScene, res.cam);
    // C · whole blocks to the screen
    gl.setRenderTarget(null);
    gl.render(res.blitScene, res.cam);
  }, 1);

  return null;
}
