const POOL = ["0", "1", "1", "0", "7", "3", "4", "9", "λ", "∫", "Σ", "π", "∂", "ζ", "⊢", "∞", "≡", "∀"];

interface Star {
  u: number;
  v: number;
  a0: number;
  r: number;
  ph: number;
  tw: number;
}
interface Light {
  u: number;
  c: string;
  r: number;
  a: number;
}
interface Spark {
  u: number;
  v: number;
  a0: number;
  ph: number;
  tw: number;
}
interface Meteor {
  x: number;
  y: number;
  mx: number;
  my: number;
  life: number;
  max: number;
}
interface Ripple {
  x: number;
  y: number;
  r: number;
  a: number;
}

const ROWS = 30;
const COLS = 70;

export class BeachScene {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private running = false;
  private raf = 0;
  private reduced: boolean;

  private horizon = 0;
  private camH = 0;
  private moonX = 0;
  private moonY = 0;
  private k = 1;

  private chars: string[] = [];
  private ox: Float32Array;
  private oy: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;

  private stars: Star[] = [];
  private lights: Light[] = [];
  private sparks: Spark[] = [];
  private clouds: number[][] = [];
  private meteors: Meteor[] = [];
  private meteorQueue: number[] = [];
  private nextMeteor = 2200;
  private ripples: Ripple[] = [];

  private pointer = { x: -9999, y: -9999, nx: 0, ny: 0 };
  private progress = 0;
  private grain: HTMLCanvasElement | null = null;

  private skyG: CanvasGradient | null = null;
  private seaG: CanvasGradient | null = null;
  private glowA: CanvasGradient | null = null;
  private glowB: CanvasGradient | null = null;

  private onResize = () => this.resize();
  private onVis = () => {
    if (document.hidden) this.pause();
    else this.play();
  };

  constructor(canvas: HTMLCanvasElement) {
    this.cv = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const n = ROWS * COLS;
    this.ox = new Float32Array(n);
    this.oy = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    for (let i = 0; i < n; i++) this.chars.push(POOL[Math.floor(Math.random() * POOL.length)]);

    for (let i = 0; i < 120; i++) {
      this.stars.push({
        u: Math.random(),
        v: Math.random(),
        a0: 0.1 + Math.random() * 0.32,
        r: 0.4 + Math.random() * 0.9,
        ph: Math.random() * 6.28,
        tw: 0.4 + Math.random() * 1.1
      });
    }
    for (let i = 0; i < 15; i++)
      this.lights.push({
        u: 0.55 + Math.random() * 0.21,
        c: Math.random() < 0.5 ? "255,184,106" : "255,208,138",
        r: 0.7 + Math.random() * 0.7,
        a: 0.45 + Math.random() * 0.5
      });
    for (let i = 0; i < 8; i++)
      this.lights.push({
        u: 0.86 + Math.random() * 0.12,
        c: "255,190,120",
        r: 0.7 + Math.random() * 0.8,
        a: 0.5 + Math.random() * 0.45
      });
    this.lights.push({ u: 0.1, c: "255,200,130", r: 0.8, a: 0.5 });

    this.clouds = [
      [0.16, 0.34, 0.2, 0.026, 0.05],
      [0.24, 0.37, 0.14, 0.021, 0.04],
      [0.68, 0.39, 0.23, 0.028, 0.055],
      [0.6, 0.37, 0.12, 0.019, 0.04],
      [0.585, 0.275, 0.09, 0.014, 0.1],
      [0.44, 0.25, 0.11, 0.016, 0.035]
    ];

    this.makeGrain();
    this.resize();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVis);
  }

  destroy() {
    this.pause();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVis);
  }

  setPointer(x: number, y: number) {
    if (this.reduced) return;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.nx = this.W ? (x / this.W) * 2 - 1 : 0;
    this.pointer.ny = this.H ? (y / this.H) * 2 - 1 : 0;
  }

  clearPointer() {
    this.pointer.x = -9999;
    this.pointer.y = -9999;
  }

  setProgress(p: number) {
    this.progress = Math.max(0, Math.min(1, p));
  }

  ripple(x: number, y: number) {
    if (this.reduced) return;
    this.ripples.push({ x, y, r: 0, a: 1 });
    if (this.ripples.length > 7) this.ripples.shift();
  }

  meteorShower(n = 4) {
    if (this.reduced) return;
    const now = performance.now();
    for (let q = 0; q < n; q++) this.meteorQueue.push(now + q * 280);
  }

  play() {
    if (this.running) return;
    this.running = true;
    if (this.reduced) {
      this.drawStatic();
      return;
    }
    const loop = (t: number) => {
      if (!this.running) return;
      this.draw(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private makeGrain() {
    const g = document.createElement("canvas");
    g.width = 140;
    g.height = 140;
    const gc = g.getContext("2d");
    if (!gc) return;
    const img = gc.createImageData(140, 140);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 108 + Math.floor(Math.random() * 56);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    gc.putImageData(img, 0, 0);
    this.grain = g;
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.cv.width = Math.round(this.W * dpr);
    this.cv.height = Math.round(this.H * dpr);
    this.cv.style.width = this.W + "px";
    this.cv.style.height = this.H + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.horizon = 0.46 * this.H;
    this.camH = (this.H * 0.99 - this.horizon) / 1.857;
    this.moonX = 0.58 * this.W;
    this.moonY = 0.18 * this.H;
    this.k = Math.max(0.85, Math.min(1.7, Math.min(this.W, this.H) / 560));

    this.skyG = this.ctx.createLinearGradient(0, 0, 0, this.horizon);
    this.skyG.addColorStop(0, "#04060C");
    this.skyG.addColorStop(0.55, "#070B16");
    this.skyG.addColorStop(1, "#0B101F");
    this.seaG = this.ctx.createLinearGradient(0, this.horizon, 0, this.H);
    this.seaG.addColorStop(0, "#0D1220");
    this.seaG.addColorStop(0.35, "#0C101C");
    this.seaG.addColorStop(1, "#0A0C15");

    const r1 = 130 * this.k;
    this.glowA = this.ctx.createRadialGradient(0, 0, 4, 0, 0, r1);
    this.glowA.addColorStop(0, "rgba(200,215,255,0.20)");
    this.glowA.addColorStop(0.4, "rgba(190,205,250,0.055)");
    this.glowA.addColorStop(1, "rgba(190,205,250,0)");
    this.glowB = this.ctx.createRadialGradient(0, 0, 2, 0, 0, 40 * this.k);
    this.glowB.addColorStop(0, "rgba(238,244,255,0.5)");
    this.glowB.addColorStop(1, "rgba(238,244,255,0)");

    this.sparks = [];
    const want = Math.min(260, Math.round((90 * (this.W * this.H)) / (648 * 432)));
    let tries = 0;
    while (this.sparks.length < want && tries < want * 6) {
      tries++;
      const px = Math.random() * this.W;
      const py = this.H * 0.5 + Math.random() * this.H * 0.5;
      if (py > this.shoreBase(px) + 16 && py < this.H - 2) {
        this.sparks.push({
          u: px / this.W,
          v: py / this.H,
          a0: 0.05 + Math.random() * 0.22,
          ph: Math.random() * 6.28,
          tw: 0.6 + Math.random() * 1.6
        });
      }
    }
    if (this.reduced) this.drawStatic();
  }

  private shoreBase(x: number): number {
    const x0 = 0.28 * this.W;
    const y0 = this.H + 6;
    const x1 = this.W + 10;
    const y1 = this.horizon + 0.23 * (this.H - this.horizon);
    return y0 + (x - x0) * ((y1 - y0) / (x1 - x0));
  }

  private drawStatic() {
    this.draw(9000);
  }

  private draw(t: number) {
    const ctx = this.ctx;
    const { W, H, horizon, k } = this;
    const T = t * 0.001;
    const nx = this.pointer.x > -999 ? this.pointer.nx : 0;
    const ny = this.pointer.y > -999 ? this.pointer.ny : 0;
    const fx = 648 / W;
    const moonSX = this.moonX - nx * 9 * k;
    const moonSY = this.moonY - ny * 5 * k;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = this.skyG!;
    ctx.fillRect(0, 0, W, horizon + 1);

    for (const st of this.stars) {
      const sx = st.u * W - nx * 7 * k;
      const sy = st.v * (horizon - 44 * k) + 8;
      const md = Math.hypot(sx - moonSX, sy - moonSY);
      let a = st.a0 * (md < 100 * k ? 0.25 : 1);
      if (!this.reduced) a *= 0.7 + 0.3 * Math.sin(T * st.tw + st.ph);
      ctx.fillStyle = `rgba(235,240,252,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, st.r * k, 0, 6.2832);
      ctx.fill();
    }

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      ctx.fillStyle =
        i === 4 ? `rgba(190,200,230,${c[4]})` : `rgba(150,162,190,${c[4]})`;
      ctx.beginPath();
      ctx.ellipse(c[0] * W - nx * 6 * k, c[1] * H, c[2] * W, c[3] * H, 0, 0, 6.2832);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "lighter";
    ctx.save();
    ctx.translate(moonSX, moonSY);
    ctx.fillStyle = this.glowA!;
    ctx.fillRect(-135 * k, -135 * k, 270 * k, 270 * k);
    ctx.fillStyle = this.glowB!;
    ctx.fillRect(-44 * k, -44 * k, 88 * k, 88 * k);
    ctx.restore();
    ctx.fillStyle = "rgba(244,247,255,0.95)";
    ctx.beginPath();
    ctx.arc(moonSX, moonSY, 10.5 * k, 0, 6.2832);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    if (!this.reduced) {
      const now = t;
      if (this.meteorQueue.length && now >= this.meteorQueue[0]) {
        this.meteorQueue.shift();
        this.spawnMeteor();
      }
      if (now > this.nextMeteor) {
        this.spawnMeteor();
        this.nextMeteor = now + 2600 + Math.random() * 3200;
      }
      ctx.globalCompositeOperation = "lighter";
      for (let q = this.meteors.length - 1; q >= 0; q--) {
        const m = this.meteors[q];
        m.x += m.mx * k;
        m.y += m.my * k;
        m.life++;
        let a = Math.min(1, m.life / 7) * Math.min(1, (m.max - m.life) / 16);
        if (m.y > horizon - 46 * k) a *= Math.max(0, (horizon - 36 * k - m.y) / (10 * k));
        if (a <= 0 || m.life >= m.max) {
          this.meteors.splice(q, 1);
          continue;
        }
        const tx = m.x - m.mx * 26 * k;
        const ty = m.y - m.my * 26 * k;
        const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
        g.addColorStop(0, `rgba(240,246,255,${a.toFixed(3)})`);
        g.addColorStop(1, "rgba(170,190,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5 * k;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = `rgba(245,250,255,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.6 * k, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 1;
      for (let q = this.ripples.length - 1; q >= 0; q--) {
        const rp = this.ripples[q];
        rp.r += 4.4 * k;
        rp.a -= 0.013;
        if (rp.a <= 0) this.ripples.splice(q, 1);
      }
    }

    const sil = -nx * 4 * k;
    ctx.fillStyle = "#04060C";
    ctx.beginPath();
    ctx.moveTo(0.4 * W + sil, horizon);
    ctx.quadraticCurveTo(0.47 * W + sil, horizon - 13 * k, 0.55 * W + sil, horizon);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.74 * W + sil, horizon);
    ctx.quadraticCurveTo(0.79 * W + sil, horizon - 6 * k, 0.84 * W + sil, horizon);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#04050B";
    ctx.beginPath();
    ctx.moveTo(W, horizon - 0.21 * H);
    ctx.lineTo(0.905 * W + sil, horizon - 0.13 * H);
    ctx.lineTo(0.845 * W + sil, horizon);
    ctx.lineTo(W, horizon);
    ctx.closePath();
    ctx.fill();
    for (const L of this.lights) {
      ctx.fillStyle = `rgba(${L.c},${L.a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(L.u * W + sil, horizon - 1.5, L.r * k, 0, 6.2832);
      ctx.fill();
    }

    ctx.fillStyle = this.seaG!;
    ctx.fillRect(0, horizon, W, H - horizon);
    ctx.strokeStyle = "rgba(175,190,222,0.16)";
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(W, horizon);
    ctx.stroke();

    ctx.globalCompositeOperation = "lighter";
    for (const L of this.lights) {
      ctx.fillStyle = `rgba(${L.c},0.09)`;
      ctx.fillRect(L.u * W + sil - 0.5 * k, horizon, k, 7 * k);
    }
    const colG = ctx.createLinearGradient(0, horizon, 0, horizon + 70 * k);
    colG.addColorStop(0, "rgba(215,228,252,0.20)");
    colG.addColorStop(1, "rgba(215,228,252,0)");
    ctx.fillStyle = colG;
    ctx.beginPath();
    ctx.moveTo(moonSX - 9 * k, horizon + 1);
    ctx.lineTo(moonSX + 9 * k, horizon + 1);
    ctx.lineTo(moonSX + 25 * k, horizon + 70 * k);
    ctx.lineTo(moonSX - 25 * k, horizon + 70 * k);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    const wb = 9 * k * Math.sin(0.5 * T);
    const shoreY = (x: number) =>
      this.shoreBase(x) +
      wb +
      7 * k * Math.sin(0.01 * x * fx - 0.8 * T) +
      4 * k * Math.sin(0.023 * x * fx + 0.5 * T);

    ctx.fillStyle = "#2A2B38";
    ctx.beginPath();
    ctx.moveTo(-10, shoreY(-10));
    for (let x = 6; x <= W + 12; x += 16) ctx.lineTo(x, shoreY(x));
    ctx.lineTo(W + 12, H + 60);
    ctx.lineTo(-10, H + 60);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#141318";
    ctx.beginPath();
    ctx.moveTo(-10, shoreY(-10) + 13 * k);
    for (let x = 6; x <= W + 12; x += 16) ctx.lineTo(x, shoreY(x) + 13 * k);
    ctx.lineTo(W + 12, H + 60);
    ctx.lineTo(-10, H + 60);
    ctx.closePath();
    ctx.fill();

    const sh = shoreY(moonSX);
    if (sh < H) {
      ctx.globalCompositeOperation = "lighter";
      const strG = ctx.createLinearGradient(0, sh, 0, H);
      strG.addColorStop(0, "rgba(210,222,245,0.09)");
      strG.addColorStop(1, "rgba(210,222,245,0)");
      ctx.fillStyle = strG;
      ctx.beginPath();
      ctx.moveTo(moonSX - 11 * k, sh);
      ctx.lineTo(moonSX + 11 * k, sh);
      ctx.lineTo(moonSX + 26 * k, H);
      ctx.lineTo(moonSX - 26 * k, H);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    for (const sp of this.sparks) {
      const a = sp.a0 * (this.reduced ? 1 : 0.6 + 0.4 * Math.sin(T * sp.tw + sp.ph));
      ctx.fillStyle = `rgba(230,236,248,${a.toFixed(3)})`;
      ctx.fillRect(sp.u * W, sp.v * H, 1, 1);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = W / 2 - nx * 2 * k;
    const dxw = 0.05 * W;
    const pathBoost = 0.8 + 0.5 * this.progress;
    const R = 110 * k;

    for (let j = 0; j < ROWS; j++) {
      const z = 900 - j * (760 / (ROWS - 1));
      const s = 260 / z;
      const u = (s - 0.289) / 1.568;
      const yb = horizon + this.camH * s;
      const fsz = Math.max(11, (10.5 + 8.5 * (s - 0.289)) * k);
      ctx.font = `400 ${fsz.toFixed(1)}px "Space Grotesk", sans-serif`;
      const step = s < 0.42 ? 3 : s < 0.7 ? 2 : 1;
      const fade = 0.3 + 0.7 * u;
      for (let i = 0; i < COLS; i += step) {
        const idx = j * COLS + i;
        const X = (i - (COLS - 1) / 2) * dxw;
        const sx0 = cx + X * s;
        if (sx0 < -24 || sx0 > W + 24) continue;
        const h =
          22 *
          k *
          (0.58 * Math.sin(0.35 * i + 0.0022 * z - 0.95 * T) +
            0.42 * Math.sin(0.176 * i - 0.0031 * z - 0.5 * T) +
            0.16 * Math.sin(0.545 * i + 0.011 * z - 1.6 * T));
        let sy = yb - h * s;
        let rl = 0;
        for (const rp of this.ripples) {
          const rd = Math.abs(Math.hypot(rp.x - sx0, rp.y - sy) - rp.r);
          if (rd < 34 * k) rl += rp.a * (1 - rd / (34 * k));
        }
        if (rl > 1) rl = 1;
        sy -= 26 * k * rl;
        if (sy < horizon + 20 * k) sy = horizon + 20 * k;
        const wlx = shoreY(sx0);
        let kk = 1;
        if (sy > wlx - 6) {
          kk = (wlx + 10 * k - sy) / (16 * k);
          if (kk <= 0.02) continue;
          if (kk > 1) kk = 1;
        }
        let vin = (h / (25 * k)) * 0.5 + 0.5 + 0.9 * rl;
        if (vin < 0) vin = 0;
        if (vin > 1) vin = 1;
        const v = Math.pow(vin, 2.2);
        const sig = (22 + 70 * u) * (W / 648);
        const gxx = (sx0 - moonSX) / sig;
        const ml = Math.exp(-gxx * gxx) * (0.6 + 0.4 * (1 - u)) * 0.95 * pathBoost;
        let al = (fade * (0.05 + 0.55 * v) + ml * (0.22 + 0.5 * v)) * kk;
        if (al > 0.95) al = 0.95;

        if (!this.reduced) {
          const px = sx0 + this.ox[idx];
          const py = sy + this.oy[idx];
          if (this.pointer.x > -999) {
            const dx2 = px - this.pointer.x;
            const dy2 = py - this.pointer.y;
            const d2 = Math.hypot(dx2, dy2);
            if (d2 < R && d2 > 0.5) {
              const tt = 1 - d2 / R;
              const ac = 1.9 * tt * tt * k;
              this.vx[idx] += (dx2 / d2) * ac * 1.25;
              this.vy[idx] += (dy2 / d2) * ac;
            }
          }
          this.vx[idx] = (this.vx[idx] - 0.011 * this.ox[idx]) * 0.88;
          this.vy[idx] = (this.vy[idx] - 0.011 * this.oy[idx]) * 0.88;
          this.ox[idx] += this.vx[idx];
          this.oy[idx] += this.vy[idx];
          const cap = 80 * k;
          if (this.ox[idx] > cap) this.ox[idx] = cap;
          if (this.ox[idx] < -cap) this.ox[idx] = -cap;
          if (this.oy[idx] > cap) this.oy[idx] = cap;
          if (this.oy[idx] < -cap) this.oy[idx] = -cap;
        }

        let cr = 110;
        let cg = 126;
        let cb = 162;
        cr = cr + (205 - cr) * v * 0.6;
        cg = cg + (220 - cg) * v * 0.6;
        cb = cb + (248 - cb) * v * 0.55;
        if (ml > 0.02) {
          cr = cr + (242 - cr) * ml;
          cg = cg + (248 - cg) * ml;
          cb = cb + (255 - cb) * ml;
        }
        ctx.fillStyle = `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${al.toFixed(3)})`;
        ctx.fillText(this.chars[idx], sx0 + this.ox[idx], sy + this.oy[idx]);
      }
    }

    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(225,235,250,0.06)";
    ctx.lineWidth = 5 * k;
    ctx.beginPath();
    ctx.moveTo(-10, shoreY(-10));
    for (let x = 6; x <= W + 12; x += 14) ctx.lineTo(x, shoreY(x));
    ctx.stroke();
    ctx.strokeStyle = "rgba(230,240,252,0.26)";
    ctx.lineWidth = 1.7 * k;
    ctx.beginPath();
    ctx.moveTo(-10, shoreY(-10));
    for (let x = 6; x <= W + 12; x += 14) ctx.lineTo(x, shoreY(x));
    ctx.stroke();
    ctx.strokeStyle = "rgba(220,232,248,0.09)";
    ctx.lineWidth = 3 * k;
    ctx.beginPath();
    let started = false;
    for (let x = -10; x <= W + 12; x += 14) {
      const y2 = shoreY(x) - 26 * k - 10 * k * Math.sin(0.008 * x * fx + 0.6 * T);
      if (y2 > horizon + 56 * k) {
        if (!started) {
          ctx.moveTo(x, y2);
          started = true;
        } else ctx.lineTo(x, y2);
      }
    }
    ctx.stroke();
    for (let x = 30; x < W; x += 120) {
      const y2 = shoreY(x) - 26 * k - 10 * k * Math.sin(0.008 * x * fx + 0.6 * T);
      if (y2 > horizon + 56 * k) {
        ctx.fillStyle = "rgba(215,228,245,0.04)";
        ctx.beginPath();
        ctx.ellipse(x, y2, 56 * k, 8 * k, 0, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1;

    if (this.grain) {
      ctx.save();
      ctx.globalAlpha = 0.045;
      ctx.globalCompositeOperation = "overlay";
      const offX = this.reduced ? 0 : Math.floor(Math.random() * 140);
      const offY = this.reduced ? 0 : Math.floor(Math.random() * 140);
      for (let gy = -offY; gy < H; gy += 140) {
        for (let gx = -offX; gx < W; gx += 140) {
          ctx.drawImage(this.grain, gx, gy);
        }
      }
      ctx.restore();
    }
  }

  private spawnMeteor() {
    this.meteors.push({
      x: 0.1 * this.W + Math.random() * 0.8 * this.W,
      y: 0.03 * this.H + Math.random() * 0.28 * this.H,
      mx: (Math.random() < 0.5 ? -1 : 1) * (2.6 + Math.random() * 1.5),
      my: 0.7 + Math.random() * 0.8,
      life: 0,
      max: 60 + Math.random() * 25
    });
  }
}
