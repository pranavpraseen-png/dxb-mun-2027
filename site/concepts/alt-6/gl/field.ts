// The WebGL2 runner for the dither field: one canvas at block resolution, a pointer trail, and the loader state.
// No library: a single full-screen triangle and one program (see LIBRARY.md for why Paper Shaders' mount was not used).
import { frag, vert, TRAIL } from './shader';
import { buildMatrix, drawDots, type Matrix } from './font5x7';
import { DUBAI_LABEL } from '../content';

/** Plain numbers the loader timeline tweens; the render loop reads them every frame. */
export const fieldState = { print: 0, blink: 0, flood: 0, resolve: 1, field: 1, lens: 1, scroll: 0 };

type Opts = { still: boolean; lines: string[] };

export class Field {
  canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private layerTex: WebGLTexture;
  private matrixTex: WebGLTexture;
  private matrix: Matrix;
  private raf = 0;
  private start = performance.now();
  private visible = true;
  private block = 3;
  private cols = 1;
  private rows = 1;
  private pitch = 2;
  private mOrigin = [0, 0];
  private trail: number[] = new Array(TRAIL * 3).fill(0);
  private target = { x: 0, y: 0, t: -1e9 };
  private still: boolean;
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;
  private disposed = false;
  /** Lens centre in CSS px, for the readout. */
  lens = { x: 0, y: 0 };

  constructor(private host: HTMLElement, opts: Opts) {
    this.still = opts.still;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'field-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(this.canvas);
    const gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('webgl2 unavailable');
    this.gl = gl;
    this.prog = this.program();
    for (const n of ['u_res', 'u_time', 'u_scroll', 'u_trail', 'u_lens', 'u_layer', 'u_matrix', 'u_mSize', 'u_mOrigin', 'u_mPitch', 'u_print', 'u_blink', 'u_flood', 'u_resolve', 'u_field'])
      this.u[n] = gl.getUniformLocation(this.prog, n);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.layerTex = this.texture();
    this.matrixTex = this.texture();
    this.matrix = buildMatrix(opts.lines);
    gl.bindTexture(gl.TEXTURE_2D, this.matrixTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.matrix.w, this.matrix.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.matrix.data);

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.kick(); });
    this.io.observe(host);
    document.addEventListener('visibilitychange', this.kick);
    if (!this.still) {
      addEventListener('pointermove', this.onPointer, { passive: true });
      addEventListener('pointerdown', this.onPointer, { passive: true });
      addEventListener('touchmove', this.onTouch, { passive: true });
      addEventListener('touchstart', this.onTouch, { passive: true });
    }
    this.kick();
  }

  get chars() { return this.matrix.chars; }
  get lineStarts() { return this.matrix.lines; }

  private program() {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vert));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    gl.useProgram(p);
    return p;
  }

  private texture() {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /** Canvas = one texel per block; each block is a whole number of device pixels (DPR capped at 2). */
  private resize = () => {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const phone = w < 760;
    const blockDev = Math.max(1, Math.round((phone ? 2 : 3) * dpr));
    this.block = blockDev / dpr; // CSS px per block
    this.cols = Math.ceil((w * dpr) / blockDev);
    this.rows = Math.ceil((h * dpr) / blockDev);
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.canvas.style.width = `${(this.cols * blockDev) / dpr}px`;
    this.canvas.style.height = `${(this.rows * blockDev) / dpr}px`;
    this.gl.viewport(0, 0, this.cols, this.rows);
    // the printout: dot pitch 2 texels on wide screens (spaced dots), 1 on phones; left edge on the page margin
    this.pitch = phone ? 1 : 2;
    const margin = phone ? 16 : Math.max(32, Math.round(w * 0.05));
    const mw = this.matrix.w * this.pitch, mh = this.matrix.h * this.pitch;
    this.mOrigin = [Math.round(margin / this.block), Math.round((this.rows - mh) / 2)];
    if (mw > this.cols - this.mOrigin[0] * 2) this.mOrigin[0] = Math.max(0, Math.round((this.cols - mw) / 2));
    this.drawLayer(w, h);
    if (this.target.t < 0) { this.target.x = this.cols * 0.62; this.target.y = this.rows * 0.46; this.seedTrail(); }
    this.kick();
  };

  /** The second layer, drawn at block resolution and thresholded: the motto and the Dubai coordinates. */
  private drawLayer(cssW: number, cssH: number) {
    const c = document.createElement('canvas');
    c.width = this.cols; c.height = this.rows;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#fff';
    const phone = cssW < 760;
    const fam = '"Sofia Sans Extra Condensed Variable", "Arial Narrow", sans-serif';
    const words = phone ? ['DIPLOMACY', 'AROUND', 'US'] : ['DIPLOMACY', 'AROUND US'];
    // size so the longest word fills ~88% of the width
    let size = 100;
    ctx.font = `900 ${size}px ${fam}`;
    const widest = Math.max(...words.map((wd) => ctx.measureText(wd).width));
    size = Math.floor((size * c.width * (phone ? 0.92 : 0.86)) / widest);
    size = Math.min(size, Math.floor((c.height * (phone ? 0.24 : 0.36))));
    ctx.font = `900 ${size}px ${fam}`;
    ctx.textBaseline = 'alphabetic';
    const lh = size * 0.86;
    const top = c.height * (phone ? 0.3 : 0.2);
    words.forEach((wd, i) => {
      const mw = ctx.measureText(wd).width;
      ctx.fillText(wd, Math.round((c.width - mw) / 2), Math.round(top + lh * (i + 1) - size * 0.12));
    });
    // coordinates in the dot font, 2 texels per dot (desktop) / 2 (phone)
    const s = 2;
    const label = DUBAI_LABEL.replace(/ · /g, '  ');
    const lw = label.length * 6 * s;
    const ly = Math.round(top + lh * words.length + size * 0.16);
    drawDots(ctx, label, Math.round((c.width - lw) / 2), ly, s);
    drawDots(ctx, 'DUBAI', Math.round((c.width - 5 * 6 * s) / 2), ly + 11 * s, s);
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    const out = new Uint8Array(c.width * c.height * 4);
    for (let i = 0; i < c.width * c.height; i++) {
      const on = img[i * 4] > 140 ? 255 : 0;
      out[i * 4] = on; out[i * 4 + 3] = 255;
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.layerTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, c.width, c.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, out);
    void cssH;
  }

  /** Called once fonts have loaded, so the motto uses the real face. */
  redrawLayer() { this.drawLayer(this.host.clientWidth, this.host.clientHeight); this.kick(); }

  private seedTrail() {
    for (let i = 0; i < TRAIL; i++) { this.trail[i * 3] = this.target.x; this.trail[i * 3 + 1] = this.target.y; }
  }

  private toTexel(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (cx - r.left) / this.block, y: (cy - r.top) / this.block };
  }
  private onPointer = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && e.type === 'pointermove') return; // touch handled below
    const p = this.toTexel(e.clientX, e.clientY);
    this.target = { x: p.x, y: p.y, t: performance.now() };
    this.kick();
  };
  private onTouch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    const p = this.toTexel(t.clientX, t.clientY);
    this.target = { x: p.x, y: p.y, t: performance.now() };
    this.kick();
  };

  /** Moves the lens to a point (CSS px inside the hero) and settles the trail there; used by still mode and tests. */
  park(x: number, y: number) {
    this.target = { x: x / this.block, y: y / this.block, t: performance.now() + 1e7 };
    this.seedTrail();
    this.kick();
  }

  private kick = () => {
    if (this.disposed || this.raf) return;
    this.raf = requestAnimationFrame(this.frame);
  };

  private frame = (now: number) => {
    this.raf = 0;
    const running = this.visible && document.visibilityState === 'visible';
    if (!running) return;
    const t = this.still ? 14 : (now - this.start) / 1000;
    this.step(now, t);
    this.draw(t);
    if (!this.still) this.kick();
  };

  private step(now: number, t: number) {
    // idle for 2.6 s (or never moved): the lens wanders on a slow Lissajous path
    if (!this.still && now - this.target.t > 2600) {
      const phone = this.cols * this.block < 760;
      this.target.x = this.cols * (0.5 + (phone ? 0.26 : 0.22) * Math.sin(t * 0.37));
      this.target.y = this.rows * (0.5 + (phone ? 0.14 : 0.2) * Math.sin(t * 0.53 + 1.2));
    }
    // head springs to the target, each point follows the one before: a fluid tail
    const R = Math.min(this.cols, this.rows) * (this.cols < this.rows ? 0.26 : 0.17);
    for (let i = 0; i < TRAIL; i++) {
      const tx = i === 0 ? this.target.x : this.trail[(i - 1) * 3];
      const ty = i === 0 ? this.target.y : this.trail[(i - 1) * 3 + 1];
      const k = this.still ? 1 : i === 0 ? 0.22 : 0.42;
      this.trail[i * 3] += (tx - this.trail[i * 3]) * k;
      this.trail[i * 3 + 1] += (ty - this.trail[i * 3 + 1]) * k;
      this.trail[i * 3 + 2] = R * (i === 0 ? 0.62 : 0.5 * (1 - (i / TRAIL) * 0.7));
    }
    this.lens.x = this.trail[0] * this.block;
    this.lens.y = this.trail[1] * this.block;
  }

  private draw(t: number) {
    const gl = this.gl, u = this.u, s = fieldState;
    gl.useProgram(this.prog);
    gl.uniform2f(u.u_res, this.cols, this.rows);
    gl.uniform1f(u.u_time, t);
    gl.uniform1f(u.u_scroll, s.scroll);
    gl.uniform3fv(u.u_trail, this.trail);
    gl.uniform1f(u.u_lens, s.lens);
    gl.uniform2f(u.u_mSize, this.matrix.w, this.matrix.h);
    gl.uniform2f(u.u_mOrigin, this.mOrigin[0], this.mOrigin[1]);
    gl.uniform1f(u.u_mPitch, this.pitch);
    gl.uniform1f(u.u_print, s.print);
    gl.uniform1f(u.u_blink, s.blink);
    gl.uniform1f(u.u_flood, s.flood);
    gl.uniform1f(u.u_resolve, s.resolve);
    gl.uniform1f(u.u_field, s.field);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.layerTex);
    gl.uniform1i(u.u_layer, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.matrixTex);
    gl.uniform1i(u.u_matrix, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Re-render now (still mode draws on demand). */
  render() { this.kick(); }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.io?.disconnect();
    document.removeEventListener('visibilitychange', this.kick);
    removeEventListener('pointermove', this.onPointer);
    removeEventListener('pointerdown', this.onPointer);
    removeEventListener('touchmove', this.onTouch);
    removeEventListener('touchstart', this.onTouch);
    this.canvas.remove();
  }
}
