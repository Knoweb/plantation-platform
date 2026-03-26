import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import { Link as RouterLink } from "react-router-dom";
 
// ─── Types ───────────────────────────────────────────────────────────────────
 
interface SmokePuff {
  src: "bungalow" | "factory";
  x: number;
  y: number;
  ox: number;
  age: number;
  life: number;
  r: number;
  drift: number;
  rise: number;
}
 
interface Picker {
  x: number;
  row: number;
  phase: number;
  speed: number;
  dir: number;
  basket: boolean;
}
 
interface TractorState {
  x: number;
  speed: number;
}
 
interface Firefly {
  x: number;
  y: number;
  phase: number;
  speed: number;
  brightness: number;
}
 
interface Bird {
  x: number;
  y: number;
  speed: number;
  sz: number;
  ft: number;
  fs: number;
}
 
interface Tree {
  rx: number;
  rh: number;
  h: number;
  w: number;
}
 
// ─── Canvas Scene ─────────────────────────────────────────────────────────────
 
const C = {
  sky0: "#050f08",
  sky1: "#0c2214",
  sky2: "#183c20",
  sky3: "#1e4d28",
  hill0: "#0d2216",
  hill1: "#143220",
  hill2: "#1a3e26",
  hill3: "#1e4a2c",
  hill4: "#224e30",
  row: ["#2d7038", "#3a8c46", "#52a85e", "#6dba78"],
  road: "#1a3020",
  roadEdge: "#2a5035",
  bungW: "#e8d5a8",
  bungR: "#8b3a2a",
  bungD: "#4a2215",
  factW: "#c4bda8",
  factR: "#6b4a35",
  water: "#1a4a30",
  waterH: "#4a9e68",
  tree: "#0e2a14",
  treeLt: "#1a4020",
  smoke: "rgba(200,215,200,",
  amber: "#d4a853",
  amber2: "#f0cc80",
  lime: "#a8d46c",
  lime2: "#caea90",
  picker: "#0a1e10",
  tractor: "#4a3820",
};
 
// ─── Scene Hook ───────────────────────────────────────────────────────────────
 
function usePlantationScene(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
 
    let W = 0,
      H = 0,
      T = 0;
    let animId = 0;
 
    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    resize();
 
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
 
    // Scene elements
    const smokePuffs: SmokePuff[] = Array.from({ length: 18 }, (_, i) => ({
      src: i < 9 ? "bungalow" : "factory",
      x: 0,
      y: 0,
      ox: (Math.random() - 0.5) * 6,
      age: Math.random() * 120,
      life: 80 + Math.random() * 60,
      r: 3 + Math.random() * 5,
      drift: (Math.random() - 0.4) * 0.25,
      rise: 0.4 + Math.random() * 0.5,
    }));
 
    const pickers: Picker[] = Array.from({ length: 7 }, (_, i) => ({
      x: 0.18 + i * 0.09 + (Math.random() - 0.5) * 0.04,
      row: Math.floor(Math.random() * 4),
      phase: Math.random() * Math.PI * 2,
      speed: 0.0004 + Math.random() * 0.0003,
      dir: Math.random() > 0.5 ? 1 : -1,
      basket: Math.random() > 0.5,
    }));
 
    const tractor: TractorState = { x: -0.08, speed: 0.0006 };
 
    const flies: Firefly[] = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: 0.45 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.001 + Math.random() * 0.001,
      brightness: Math.random(),
    }));
 
    const birds: Bird[] = Array.from({ length: 9 }, (_, i) => ({
      x: -0.1 - i * 0.04,
      y: 0.06 + i * 0.012 + (i % 3) * 0.015,
      speed: 0.0014 + i * 0.00008,
      sz: 3.5 + Math.random() * 3.5,
      ft: Math.random() * Math.PI * 2,
      fs: 0.048 + Math.random() * 0.04,
    }));
 
    const trees: Tree[] = [
      { rx: 0.08, rh: 0.48, h: 0.22, w: 0.014 },
      { rx: 0.14, rh: 0.5, h: 0.2, w: 0.012 },
      { rx: 0.22, rh: 0.51, h: 0.19, w: 0.011 },
      { rx: 0.58, rh: 0.52, h: 0.18, w: 0.011 },
      { rx: 0.66, rh: 0.5, h: 0.21, w: 0.013 },
      { rx: 0.82, rh: 0.48, h: 0.24, w: 0.015 },
      { rx: 0.88, rh: 0.49, h: 0.22, w: 0.013 },
    ];
 
    // Draw helpers
    const drawStream = (hillYMid: number) => {
      ctx.save();
      ctx.beginPath();
      const sy = hillYMid + H * 0.04;
      ctx.moveTo(0, sy + 8);
      for (let x = 0; x <= W; x += 8) {
        const wy =
          sy +
          Math.sin(x * 0.018 + T * 0.0008) * 5 +
          Math.sin(x * 0.007 + T * 0.0004) * 8;
        ctx.lineTo(x, wy);
      }
      ctx.lineTo(W, sy + 20);
      ctx.lineTo(W, sy + 25);
      for (let x = W; x >= 0; x -= 8) {
        const wy =
          sy +
          12 +
          Math.sin(x * 0.018 + T * 0.0008) * 5 +
          Math.sin(x * 0.007 + T * 0.0004) * 8;
        ctx.lineTo(x, wy);
      }
      ctx.closePath();
      const sg = ctx.createLinearGradient(0, sy, 0, sy + 25);
      sg.addColorStop(0, C.water);
      sg.addColorStop(0.5, C.waterH);
      sg.addColorStop(1, C.water);
      ctx.fillStyle = sg;
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = C.waterH;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const wy = sy + 4 + Math.sin(x * 0.03 + T * 0.002) * 2;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();
      ctx.restore();
    };
 
    const drawRoad = (nearHillY: number) => {
      const ry = nearHillY - H * 0.02;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(W * 0.3, ry);
      ctx.bezierCurveTo(
        W * 0.38,
        ry + H * 0.06,
        W * 0.48,
        ry + H * 0.04,
        W * 0.6,
        ry + H * 0.08
      );
      ctx.bezierCurveTo(
        W * 0.72,
        ry + H * 0.12,
        W * 0.8,
        ry + H * 0.06,
        W * 0.95,
        ry + H * 0.14
      );
      ctx.lineWidth = 9;
      ctx.strokeStyle = C.road;
      ctx.globalAlpha = 0.75;
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = C.roadEdge;
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.restore();
    };
 
    const drawBungalow = (bx: number, by: number) => {
      ctx.save();
      const s = H * 0.07;
      ctx.fillStyle = C.bungW;
      ctx.globalAlpha = 0.92;
      ctx.fillRect(bx - s * 0.7, by - s * 0.55, s * 1.4, s * 0.55);
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.85, by - s * 0.55);
      ctx.lineTo(bx, by - s);
      ctx.lineTo(bx + s * 0.85, by - s * 0.55);
      ctx.closePath();
      ctx.fillStyle = C.bungR;
      ctx.fill();
      ctx.fillStyle = C.bungW;
      ctx.globalAlpha = 0.6;
      for (let p = -2; p <= 2; p++) {
        ctx.fillRect(bx + p * s * 0.28 - 2, by - s * 0.55, 4, s * 0.55);
      }
      ctx.fillStyle = C.amber;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(T * 0.002);
      ctx.fillRect(bx - s * 0.45, by - s * 0.45, s * 0.2, s * 0.22);
      ctx.fillRect(bx + s * 0.25, by - s * 0.45, s * 0.2, s * 0.22);
      ctx.fillStyle = C.bungD;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(bx - s * 0.1, by - s * 0.42, s * 0.2, s * 0.42);
      ctx.fillStyle = "#5a3a2a";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(bx + s * 0.3, by - s * 1.05, s * 0.12, s * 0.55);
      ctx.restore();
    };
 
    const drawFactory = (fx: number, fy: number) => {
      ctx.save();
      const s = H * 0.08;
      ctx.fillStyle = C.factW;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(fx - s, fy - s * 0.6, s * 2, s * 0.6);
      ctx.beginPath();
      ctx.moveTo(fx - s, fy - s * 0.6);
      ctx.lineTo(fx - s * 1.05, fy - s * 0.68);
      ctx.lineTo(fx + s * 1.05, fy - s * 0.68);
      ctx.lineTo(fx + s, fy - s * 0.6);
      ctx.closePath();
      ctx.fillStyle = C.factR;
      ctx.fill();
      ctx.fillStyle = "#3a3028";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(fx + s * 0.55, fy - s * 1.35, s * 0.18, s * 0.75);
      ctx.fillStyle = "rgba(180,210,220,.35)";
      ctx.globalAlpha = 1;
      for (let w = -3; w <= 3; w++) {
        ctx.fillRect(fx + w * s * 0.28 - s * 0.08, fy - s * 0.5, s * 0.16, s * 0.25);
      }
      ctx.fillStyle = C.factW;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(fx - s * 1.3, fy - s * 0.42, s * 0.35, s * 0.42);
      ctx.restore();
    };
 
    const tickSmoke = () => {
      const bungX = W * 0.38;
      const bungY = H * 0.54 - H * 0.07 * 1.05;
      const factX = W * 0.7;
      const factY = H * 0.5 - H * 0.08 * 1.35;
      for (const p of smokePuffs) {
        p.age++;
        if (p.age > p.life) {
          p.age = 0;
          p.life = 80 + Math.random() * 60;
          p.r = 3 + Math.random() * 5;
        }
        const ox =
          p.src === "bungalow" ? bungX + H * 0.07 * 0.36 : factX + H * 0.08 * 0.64;
        const oy = p.src === "bungalow" ? bungY : factY;
        p.x = ox + p.ox + Math.sin(p.age * 0.05) * 4;
        p.y = oy - p.age * p.rise;
      }
    };
 
    const drawSmoke = () => {
      for (const p of smokePuffs) {
        const ratio = p.age / p.life;
        const alpha = Math.sin(ratio * Math.PI) * 0.25;
        const r = p.r + ratio * 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = C.smoke + alpha + ")";
        ctx.fill();
      }
    };
 
    const drawPicker = (px: number, py: number, phase: number, basket: boolean) => {
      const s = H * 0.025;
      ctx.save();
      ctx.fillStyle = C.picker;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.ellipse(px, py, s * 0.22, s * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py - s * 0.46, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - s * 0.28, py - s * 0.46);
      ctx.lineTo(px, py - s * 0.82);
      ctx.lineTo(px + s * 0.28, py - s * 0.46);
      ctx.closePath();
      ctx.fillStyle = "#4a6e35";
      ctx.fill();
      ctx.strokeStyle = C.picker;
      ctx.lineWidth = s * 0.18;
      ctx.lineCap = "round";
      const armX = Math.sin(phase) * s * 0.3;
      ctx.beginPath();
      ctx.moveTo(px, py - s * 0.1);
      ctx.lineTo(px + armX + s * 0.35, py - s * 0.35);
      ctx.stroke();
      if (basket) {
        ctx.fillStyle = "#6b4a25";
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(px - s * 0.25, py - s * 0.1, s * 0.2, s * 0.28, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
 
    const drawTractor = (tx: number, ty: number) => {
      ctx.save();
      const s = H * 0.032;
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = "#5a7a35";
      ctx.fillRect(tx - s, ty - s * 0.6, s * 1.8, s * 0.6);
      ctx.fillStyle = "#3a5225";
      ctx.fillRect(tx + s * 0.2, ty - s * 1.0, s * 0.7, s * 0.42);
      ctx.fillStyle = "#2a2a1a";
      ctx.beginPath();
      ctx.arc(tx - s * 0.3, ty, s * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tx + s * 0.85, ty, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5a5a3a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx - s * 0.3, ty, s * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tx + s * 0.85, ty, s * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
 
    const drawTree = (rx: number, rh: number, h: number, w: number) => {
      const tx = rx * W;
      const ty = rh * H;
      const th = h * H;
      const tw = w * W;
      ctx.save();
      ctx.fillStyle = "#2a4820";
      ctx.globalAlpha = 0.8;
      ctx.fillRect(tx - tw * 0.25, ty - th * 0.1, tw * 0.5, th * 0.1);
      const cg = ctx.createRadialGradient(
        tx, ty - th * 0.55, 0,
        tx, ty - th * 0.55, tw * 2.5
      );
      cg.addColorStop(0, "#2a5a30");
      cg.addColorStop(0.5, "#1e4426");
      cg.addColorStop(1, "#162e1c");
      ctx.fillStyle = cg;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.ellipse(tx, ty - th * 0.55, tw * 1.2, th * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(100,180,110,.12)";
      ctx.beginPath();
      ctx.ellipse(tx - tw * 0.3, ty - th * 0.65, tw * 0.6, th * 0.25, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
 
    const hillPath = (seed: number, amp: number, baseY: number, wl: number) => {
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 3) {
        const y =
          baseY +
          Math.sin(x / wl + seed + T * 0.000125) * amp +
          Math.sin(x / (wl * 0.52) + seed * 1.5 + T * 0.000175) * amp * 0.38 +
          Math.sin(x / (wl * 0.22) + seed * 2.1 + T * 0.000095) * amp * 0.14;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
    };
 
    const teaRows = (
      seed: number,
      amp: number,
      baseY: number,
      wl: number,
      colors: string[],
      count: number
    ) => {
      for (let r = 0; r < count; r++) {
        ctx.beginPath();
        let first = true;
        for (let x = 0; x <= W; x += 6) {
          const hy =
            baseY +
            r * 12 +
            Math.sin(x / wl + seed + T * 0.000125) * (amp - r * 1.6) +
            Math.sin(x / (wl * 0.52) + seed * 1.5 + T * 0.000175) * (amp * 0.36 - r * 0.7) +
            Math.sin(x / (wl * 0.22) + seed * 2.1 + T * 0.000095) * (amp * 0.12 - r * 0.3);
          const dy = Math.sin(x * 0.038 + T * 0.001 + r * 0.7) * 3.5;
          if (first) {
            ctx.moveTo(x, hy + dy);
            first = false;
          } else ctx.lineTo(x, hy + dy);
        }
        ctx.strokeStyle = colors[r % colors.length];
        ctx.lineWidth = r < 3 ? 2.5 : 2;
        ctx.globalAlpha = 0.12 + 0.09 * Math.sin(T * 0.001 + r * 0.8 + seed);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
 
    const drawSun = (sx: number, sy: number) => {
      for (let i = 0; i < 14; i++) {
        const ang = -0.82 + (i / 14) * 1.65;
        const len = 240 + Math.sin(T * 0.0009 + i) * 55;
        const g = ctx.createLinearGradient(
          sx, sy,
          sx + Math.cos(ang) * len,
          sy + Math.sin(ang) * len
        );
        g.addColorStop(0, "rgba(168,212,108,.13)");
        g.addColorStop(1, "rgba(168,212,108,0)");
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(ang - 0.048) * len, sy + Math.sin(ang - 0.048) * len);
        ctx.lineTo(sx + Math.cos(ang + 0.048) * len, sy + Math.sin(ang + 0.048) * len);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 0.0007 + i * 0.75);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const og = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90);
      og.addColorStop(0, "rgba(210,240,160,.35)");
      og.addColorStop(0.4, "rgba(168,212,108,.15)");
      og.addColorStop(1, "rgba(168,212,108,0)");
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(sx, sy, 90, 0, Math.PI * 2);
      ctx.fill();
      const cg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 28);
      cg.addColorStop(0, "rgba(240,250,200,.75)");
      cg.addColorStop(0.5, "rgba(210,240,140,.45)");
      cg.addColorStop(1, "rgba(168,212,108,0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(sx, sy, 28, 0, Math.PI * 2);
      ctx.fill();
    };
 
    const drawFireflies = () => {
      for (const f of flies) {
        f.phase += f.speed;
        const blink = Math.sin(f.phase) * Math.sin(f.phase * 2.3);
        if (blink < 0) continue;
        const alpha = blink * 0.55;
        const px = f.x * W + Math.sin(f.phase * 0.7) * 12;
        const py = f.y * H + Math.cos(f.phase * 0.5) * 8;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,240,160,${alpha})`;
        ctx.fill();
        const gl = ctx.createRadialGradient(px, py, 0, px, py, 6);
        gl.addColorStop(0, `rgba(180,240,140,${alpha * 0.5})`);
        gl.addColorStop(1, "rgba(180,240,140,0)");
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    };
 
    const drawBirds = () => {
      for (const b of birds) {
        b.x += b.speed;
        b.ft += b.fs;
        if (b.x > 1.12) b.x = -0.08;
        const bx = b.x * W,
          by = b.y * H;
        const flap = Math.sin(b.ft) * b.sz * 0.65;
        ctx.save();
        ctx.translate(bx, by);
        ctx.globalAlpha = 0.38;
        ctx.strokeStyle = "rgba(190,240,200,.85)";
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-b.sz, flap);
        ctx.quadraticCurveTo(0, 0, b.sz, flap);
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawFlowBands = () => {
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const yBase = H * (0.24 + i * 0.055);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const y =
            yBase +
            Math.sin(x * 0.011 + T * 0.0012 + i * 0.9) * (4 + (i % 3)) +
            Math.sin(x * 0.024 + T * 0.0007 + i * 0.5) * 2.2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = i % 2 === 0 ? "rgba(126, 197, 138, 0.14)" : "rgba(82, 168, 94, 0.12)";
        ctx.lineWidth = i % 3 === 0 ? 2 : 1.3;
        ctx.stroke();
      }
      ctx.restore();
    };
 
    const render = () => {
      T++;
      ctx.clearRect(0, 0, W, H);
 
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#050f08");
      sky.addColorStop(0.22, "#0b2010");
      sky.addColorStop(0.5, "#143820");
      sky.addColorStop(0.8, "#1c4e2c");
      sky.addColorStop(1, "#1e5530");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
 
      const sx = W * 0.68,
        sy = H * 0.19;
      drawSun(sx, sy);
 
      const fSeed = 0.9, fAmp = H * 0.14, fBase = H * 0.34, fWl = W * 0.6;
      hillPath(fSeed, fAmp, fBase, fWl);
      const fg1 = ctx.createLinearGradient(0, H * 0.2, 0, H);
      fg1.addColorStop(0, "#102614");
      fg1.addColorStop(1, "#0b1e10");
      ctx.fillStyle = fg1;
      ctx.fill();
      teaRows(fSeed, fAmp, fBase, fWl, [C.row[0], C.row[1]], 4);
 
      const mSeed = 2.4, mAmp = H * 0.12, mBase = H * 0.47, mWl = W * 0.46;
      hillPath(mSeed, mAmp, mBase, mWl);
      const fg2 = ctx.createLinearGradient(0, H * 0.35, 0, H);
      fg2.addColorStop(0, "#163a1e");
      fg2.addColorStop(1, "#0d2014");
      ctx.fillStyle = fg2;
      ctx.fill();
      teaRows(mSeed, mAmp, mBase, mWl, [C.row[1], C.row[2]], 6);
      drawStream(mBase + mAmp * 0.5);
 
      const nSeed = 4.3, nAmp = H * 0.09, nBase = H * 0.59, nWl = W * 0.38;
      hillPath(nSeed, nAmp, nBase, nWl);
      const fg3 = ctx.createLinearGradient(0, H * 0.5, 0, H);
      fg3.addColorStop(0, "#1a4024");
      fg3.addColorStop(1, "#0e2212");
      ctx.fillStyle = fg3;
      ctx.fill();
      teaRows(nSeed, nAmp, nBase, nWl, [C.row[2], C.row[3]], 8);
 
      drawRoad(nBase + nAmp * 0.4);
      for (const t of trees) drawTree(t.rx, t.rh, t.h, t.w);
 
      drawBungalow(W * 0.38, H * 0.54);
      drawFactory(W * 0.7, H * 0.5);
 
      const fgb = ctx.createLinearGradient(0, H * 0.68, 0, H);
      fgb.addColorStop(0, "rgba(30,80,48,0.45)");
      fgb.addColorStop(1, "rgba(5,15,8,0.75)");
      ctx.fillStyle = fgb;
      ctx.fillRect(0, H * 0.68, W, H * 0.32);
 
      ctx.beginPath();
      ctx.moveTo(0, H * 0.75);
      for (let x = 0; x <= W; x += 5) {
        const y =
          H * 0.75 +
          Math.sin(x * 0.055 + T * 0.0009) * 6 +
          Math.sin(x * 0.02 + T * 0.0006) * 11 +
          Math.sin(x * 0.008 + T * 0.0004) * 16;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      const bush = ctx.createLinearGradient(0, H * 0.72, 0, H);
      bush.addColorStop(0, "rgba(25,62,31,0.25)");
      bush.addColorStop(1, "rgba(11,33,18,0.6)");
      ctx.fillStyle = bush;
      ctx.fill();

      drawFlowBands();
 
      for (const p of pickers) {
        p.phase += p.speed * 20;
        p.x += p.speed * p.dir;
        if (p.x > 1.05) p.dir = -1;
        if (p.x < -0.02) p.dir = 1;
        const rowOffset = p.row * 12;
        const px = p.x * W;
        const py =
          nBase +
          rowOffset +
          Math.sin(px / nWl + nSeed + T * 0.000125) * (nAmp - p.row * 1.6) +
          Math.sin(px / (nWl * 0.52) + nSeed * 1.5 + T * 0.000175) * (nAmp * 0.36 - p.row * 0.7);
        drawPicker(px, py, p.phase, p.basket);
      }
 
      tractor.x += tractor.speed;
      if (tractor.x > 1.1) tractor.x = -0.12;
      const tractorBaseY = nBase + nAmp * 0.38 + H * 0.03;
      const tractorRoadY = tractorBaseY + Math.sin(tractor.x * W * 0.018 + T * 0.0008) * 4;
      drawTractor(tractor.x * W, tractorRoadY);
 
      tickSmoke();
      drawSmoke();
      drawFireflies();
      drawBirds();
 
      animId = requestAnimationFrame(render);
    };
 
    render();
 
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [canvasRef]);
}
 
// ─── Component ────────────────────────────────────────────────────────────────
 
export default function Login() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
 
  usePlantationScene(canvasRef);
 
  const doLogin = useCallback(() => {
    if (!username.trim() || !password) {
      setError("Please enter your credentials.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => setLoading(false), 1800);
  }, [username, password]);
 
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") doLogin();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doLogin]);
 
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&family=Noto+Serif+Sinhala:wght@700&display=swap');
 
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 
        :root {
          --g950: #050f08; --g900: #071510; --g800: #0d2214; --g700: #163320;
          --g600: #1f4e2a; --g500: #2b7036; --g400: #3a8c46; --g300: #52a85e;
          --g200: #7fc98a; --g100: #b8e4be; --g050: #e8f6ea;
          --lime: #a8d46c; --lime2: #caea90; --cream: #eef6ef;
          --amber: #d4a853; --amber2: #f0cc80;
          --panel: #091810;
        }
 
        .login-root {
          position: fixed; inset: 0;
          font-family: 'Outfit', sans-serif;
          background: var(--g950);
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 460px;
        }
 
        /* Visual */
        .visual { position: relative; overflow: hidden; }
        .visual canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        .mist { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .mb {
          position: absolute; left: -15%; right: -15%; border-radius: 50%;
          background: linear-gradient(to right, transparent 0%, rgba(160,220,170,.08) 35%, rgba(160,220,170,.13) 50%, rgba(160,220,170,.08) 65%, transparent 100%);
        }
        .mb-1 { top: 31%; height: 50px; animation: drift 26s 0s ease-in-out infinite alternate; }
        .mb-2 { top: 43%; height: 40px; opacity: .7; animation: drift 33s 6s ease-in-out infinite alternate; }
        .mb-3 { top: 56%; height: 32px; opacity: .45; animation: drift 20s 12s ease-in-out infinite alternate; }
        @keyframes drift { from { transform: translateX(-7%) translateY(0); } to { transform: translateX(7%) translateY(10px); } }
 
        .hero {
          position: absolute; bottom: 60px; left: 54px; max-width: 480px;
          color: var(--cream);
          animation: fup 1.2s cubic-bezier(.16,1,.3,1) .6s both;
        }
        .eyebrow {
          font-size: 10px; font-weight: 600; letter-spacing: 4px;
          text-transform: uppercase; color: var(--lime2); margin-bottom: 16px;
          display: flex; align-items: center; gap: 10px;
        }
        .eyebrow::before { content: ''; width: 32px; height: 1px; background: var(--lime); display: block; }
        .htitle {
          font-family: 'Cormorant Garamond', serif; font-size: clamp(34px,3.6vw,58px);
          font-weight: 300; line-height: 1.09; letter-spacing: -.5px; margin-bottom: 16px;
          text-shadow: 0 4px 24px rgba(5,15,8,.8);
        }
        .htitle em { font-style: italic; color: var(--lime2); }
        .hsub { font-size: 14px; font-weight: 300; line-height: 1.75; color: rgba(238,246,239,.58); max-width: 340px; }
 
        .vline {
          position: absolute; top: 0; right: 0; width: 1px; height: 100%;
          background: linear-gradient(to bottom, transparent, rgba(52,168,88,.28) 25%, rgba(52,168,88,.35) 75%, transparent);
        }
 
        /* Panel */
        .panel {
          background: var(--panel); display: flex; flex-direction: column;
          justify-content: center; padding: 52px 48px; position: relative; overflow: hidden;
          animation: sin .9s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes sin { from { transform: translateX(52px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .panel::after {
          content: ''; position: absolute; top: 0; left: 48px; right: 48px; height: 1px;
          background: linear-gradient(to right, transparent, rgba(82,168,94,.42), transparent);
        }
        .gt {
          position: absolute; top: -80px; right: -60px; width: 320px; height: 320px;
          border-radius: 50%; background: radial-gradient(circle, rgba(43,112,54,.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .gb {
          position: absolute; bottom: -55px; left: -45px; width: 260px; height: 260px;
          border-radius: 50%; background: radial-gradient(circle, rgba(82,168,94,.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .panel > * { position: relative; z-index: 1; }
 
        .logo { display: flex; align-items: center; gap: 14px; margin-bottom: 42px; animation: fup .8s cubic-bezier(.16,1,.3,1) .15s both; }
        .lmark {
          width: 46px; height: 46px; border-radius: 13px;
          border: 1px solid rgba(82,168,94,.28); background: rgba(43,112,54,.2);
          display: flex; align-items: center; justify-content: center; transition: transform .3s; flex-shrink: 0;
        }
        .lmark:hover { transform: scale(1.07); }
        .lname { font-family: 'Noto Serif Sinhala', serif; font-size: 25px; font-weight: 700; color: var(--cream); line-height: 1; }
        .lsub { font-size: 9.5px; letter-spacing: 3.5px; text-transform: uppercase; color: var(--g300); margin-top: 5px; font-weight: 500; }
 
        .fhdr { margin-bottom: 30px; animation: fup .8s cubic-bezier(.16,1,.3,1) .25s both; }
        .ftitle { font-family: 'Cormorant Garamond', serif; font-size: 38px; font-weight: 300; color: var(--cream); line-height: 1.1; margin-bottom: 8px; }
        .ftitle span { font-style: italic; color: var(--g200); }
        .fhint { font-size: 13.5px; font-weight: 300; color: rgba(170,225,180,.36); }
 
        .fields { display: flex; flex-direction: column; gap: 16px; margin-bottom: 10px; animation: fup .8s cubic-bezier(.16,1,.3,1) .35s both; }
        .field label { display: block; font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(170,225,180,.33); margin-bottom: 7px; }
        .fw { position: relative; }
        .fw input {
          width: 100%; padding: 15px 17px; background: rgba(170,225,180,.04);
          border: 1px solid rgba(82,168,94,.13); border-radius: 10px;
          color: var(--cream); font-family: 'Outfit', sans-serif; font-size: 14.5px;
          font-weight: 300; outline: none; transition: all .3s ease;
        }
        .fw input::placeholder { color: rgba(170,225,180,.18); }
        .fw input:focus { border-color: rgba(82,168,94,.48); background: rgba(43,112,54,.14); box-shadow: 0 0 0 3px rgba(58,140,70,.09); }
        .eye {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: rgba(255,255,255,.9); border: 1px solid rgba(0,0,0,.2);
          border-radius: 999px; cursor: pointer; color: #111111;
          width: 30px; height: 30px; padding: 0; display: flex; align-items: center; justify-content: center;
          transition: color .2s, background .2s, border-color .2s;
        }
        .eye:hover { color: #000000; background: #ffffff; border-color: rgba(0,0,0,.35); }

        .eye svg {
          stroke: #000000;
          opacity: 1;
        }
 
        .forgot { text-align: right; margin: 12px 0 24px; animation: fup .8s cubic-bezier(.16,1,.3,1) .4s both; }
        .forgot a { font-size: 12px; color: rgba(82,168,94,.62); text-decoration: none; transition: color .2s; }
        .forgot a:hover { color: var(--g200); }
 
        .err {
          background: rgba(150,25,25,.12); border: 1px solid rgba(180,50,50,.3);
          border-radius: 8px; padding: 11px 15px; font-size: 13px; color: #f87171;
          margin-bottom: 16px;
        }
 
        .btn {
          width: 100%; padding: 17px;
          background: linear-gradient(135deg, #2f8a42 0%, #1f6f33 55%, #165728 100%);
          border: 1px solid rgba(184,228,190,.24); border-radius: 12px; color: var(--cream);
          font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600;
          letter-spacing: 2.5px; text-transform: uppercase; cursor: pointer;
          position: relative; overflow: hidden; transition: all .28s ease;
          margin-bottom: 23px; animation: fup .8s cubic-bezier(.16,1,.3,1) .45s both;
          box-shadow: 0 10px 26px rgba(31,111,51,.34), inset 0 1px 0 rgba(255,255,255,.18);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1;
        }
        .btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,.08) 0%, transparent 60%);
          opacity: 0; transition: opacity .3s;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(43,112,54,.5), inset 0 1px 0 rgba(255,255,255,.24); }
        .btn:hover::before { opacity: 1; }
        .btn:active { transform: translateY(0); }
        .btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

        .btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(82,168,94,.24), 0 14px 32px rgba(31,111,51,.45);
        }
 
        .or { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; animation: fup .8s cubic-bezier(.16,1,.3,1) .5s both; }
        .or::before, .or::after { content: ''; flex: 1; height: 1px; background: rgba(82,168,94,.09); }
        .or span { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: rgba(170,225,180,.2); }
 
        .reg { text-align: center; font-size: 13px; color: rgba(170,225,180,.33); animation: fup .8s cubic-bezier(.16,1,.3,1) .55s both; }
        .reg a { color: var(--g200); text-decoration: none; font-weight: 500; transition: color .2s; }
        .reg a:hover { color: #fff; }
 
        .foot { margin-top: 38px; text-align: center; font-size: 10.5px; color: rgba(170,225,180,.16); letter-spacing: .5px; animation: fup .8s cubic-bezier(.16,1,.3,1) .6s both; }
 
        @keyframes fup { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 900px) {
          .login-root {
            grid-template-columns: 1fr;
          }

          .visual {
            grid-column: 1 / -1;
          }

          .panel {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: min(92vw, 560px);
            max-height: 92vh;
            overflow: auto;
            border-radius: 18px;
            border: 1px solid rgba(82,168,94,.2);
            background: rgba(9,24,16,.72);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            padding: 28px 22px;
            justify-content: flex-start;
            z-index: 2;
            animation: none;
          }

          .panel::after,
          .gt,
          .gb,
          .vline {
            display: none;
          }

          .hero {
            display: none;
          }

          .htitle {
            font-size: clamp(30px, 9vw, 48px);
            line-height: 1.08;
          }

          .hsub {
            font-size: 13px;
            max-width: 92%;
          }

          .logo { margin-bottom: 24px; }
          .fhdr { margin-bottom: 18px; }
          .ftitle { font-size: 34px; }
          .foot { margin-top: 22px; }
        }

        @media (max-width: 520px) {
          .panel {
            width: min(94vw, 440px);
            padding: 22px 16px;
          }

          .lsub { letter-spacing: 2.2px; }
          .fields { gap: 12px; }
          .btn { padding: 15px; }
        }
      `}</style>
 
      <div className="login-root">
        {/* Visual Side */}
        <div className="visual">
          <canvas ref={canvasRef} />
          <div className="mist">
            <div className="mb mb-1" />
            <div className="mb mb-2" />
            <div className="mb mb-3" />
          </div>
          <div className="hero">
            <div className="eyebrow">Estate Intelligence Platform</div>
            <h1 className="htitle">
              Rooted in
              <br />
              <em>Tradition.</em>
              <br />
              Powered by Data.
            </h1>
            <p className="hsub">
              From harvest to inventory — redefine what your plantation can achieve.
            </p>
          </div>
          <div className="vline" />
        </div>
 
        {/* Panel Side */}
        <div className="panel">
          <div className="gt" />
          <div className="gb" />
 
          <div className="logo">
            <div className="lmark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C12 2 5 7.5 5 13.5C5 17.09 8.13 20 12 20C15.87 20 19 17.09 19 13.5C19 7.5 12 2 12 2Z"
                  fill="#52a85e"
                  opacity=".9"
                />
                <path
                  d="M12 20V23"
                  stroke="#52a85e"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M9 9.5C10.2 11 12 11.5 14 10.8"
                  stroke="rgba(184,228,190,.55)"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="lname">වැවිලි</div>
              <div className="lsub">Plantation Platform</div>
            </div>
          </div>
 
          <div className="fhdr">
            <h2 className="ftitle">
              Welcome <span>back.</span>
            </h2>
            <p className="fhint">Sign in to access your estate workspace</p>
          </div>
 
          {error && <div className="err">{error}</div>}
 
          <div className="fields">
            <div className="field">
              <label>Email or Username</label>
              <div className="fw">
                <input
                  type="text"
                  placeholder="you@estate.com"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Password</label>
              <div className="fw">
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button className="eye" onClick={() => setShowPwd((v) => !v)} type="button">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
 
          <div className="forgot">
            <RouterLink to="/forgot-password">Forgot password?</RouterLink>
          </div>
 
          <button className="btn" onClick={doLogin} disabled={loading} type="button">
            {loading ? "Signing in…" : "Sign In"}
          </button>
 
          <div className="or">
            <span>or</span>
          </div>
 
          <div className="reg">
            New to the platform? <RouterLink to="/register">Create an account</RouterLink>
          </div>
 
          <div className="foot">© 2026 Knoweb (PVT) LTD · All rights reserved</div>
        </div>
      </div>
    </>
  );
}
 