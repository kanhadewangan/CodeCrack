"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrameLoop } from "../_components/motion";

const RAMP = " .:-=+*#%@";

/** Interfering sine waves rendered as characters. The field swells and ripples around the pointer. */
export function AsciiField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -1, y: -1, tx: -1, ty: -1 });
  const lastMs = useRef(0);

  const draw = useCallback((ms: number) => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    lastMs.current = ms;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const size = w < 640 ? 12 : 14;
    ctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textBaseline = "top";
    const cw = ctx.measureText("M").width || size * 0.6;
    const ch = size * 1.3;
    const cols = Math.ceil(w / cw);
    const rows = Math.ceil(h / ch);
    const t = ms / 1000;

    const p = pointer.current;
    p.x += (p.tx - p.x) * 0.15;
    p.y += (p.ty - p.y) * 0.15;
    const active = p.tx >= 0;
    const pcx = p.x / cw;
    const pcy = p.y / ch;

    const hot: [number, number, string][] = [];
    ctx.fillStyle = "rgba(203, 213, 225, 0.32)";
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const dx = x - pcx;
        const dy = (y - pcy) * 2; // cells are about twice as tall as wide
        const d2 = dx * dx + dy * dy;
        const bump = active ? Math.exp(-d2 / 110) : 0;
        const v =
          Math.sin(x * 0.11 + t * 0.9) +
          Math.sin(y * 0.23 - t * 0.6) +
          Math.sin((x + y * 2) * 0.07 + t * 0.4) +
          Math.sin(Math.sqrt(d2) * 0.5 - t * 3) * bump * 2;
        const level = (v + 3) / 6 + bump * 0.3;
        const c = RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(level * RAMP.length)))] ?? " ";
        if (bump > 0.2 && c !== " ") {
          hot.push([x, y, c]);
          line += " ";
        } else {
          line += c;
        }
      }
      ctx.fillText(line, 0, y * ch); // one draw call per row
    }
    ctx.fillStyle = "#7dd3fc";
    for (const [x, y, c] of hot) ctx.fillText(c, x * cw, y * ch);
  }, []);

  useFrameLoop(ref, draw);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const p = pointer.current;
      p.tx = e.clientX - r.left;
      p.ty = e.clientY - r.top;
      if (p.x < 0) {
        p.x = p.tx;
        p.y = p.ty;
      }
    };
    // keeps the static (reduced-motion) frame correct after a resize; the live loop resizes itself
    const ro = new ResizeObserver(() => draw(lastMs.current));
    ro.observe(cv);
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("pointermove", move);
    };
  }, [draw]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
