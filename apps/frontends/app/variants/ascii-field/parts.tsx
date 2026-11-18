"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { leaders, problems } from "../_components/data";

/** Scroll-linked: children drift down and fade as the wrapper scrolls out of the top of the viewport. */
export function ScrollFade({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, reduce ? 1 : 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ opacity, y }}>{children}</motion.div>
    </div>
  );
}

const NOISE = "#%*+=-:.";

/** Label that resolves out of ASCII noise when it enters the viewport or is hovered. */
export function Scramble({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(text.length);

  useEffect(() => {
    if (step >= text.length) return;
    const id = setTimeout(() => setStep(step + 1), 32);
    return () => clearTimeout(id);
  }, [step, text.length]);

  const run = () => {
    if (!reduce) setStep(0);
  };
  const shown = [...text]
    .map((c, i) => (i < step || c === " " ? c : (NOISE[(i * 7 + step * 3) % NOISE.length] ?? c)))
    .join("");

  return (
    <motion.span className={className} onViewportEnter={run} onHoverStart={run} viewport={{ once: true }}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </motion.span>
  );
}

const tabs = ["Problems", "Contest", "Leaderboard"] as const;
type Tab = (typeof tabs)[number];
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300";

/** Tabbed product preview. The active pill slides between tabs (shared layout), panels cross-fade. */
export function Preview() {
  const [tab, setTab] = useState<Tab>("Problems");
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm sm:p-6">
      <div role="tablist" aria-label="Product preview" className="mb-5 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="preview-panel"
            onClick={() => setTab(t)}
            className={`relative rounded-full px-4 py-2 text-sm transition-colors ${tab === t ? "text-black" : "text-slate-300 hover:text-white"} ${focus}`}
          >
            {tab === t && (
              <motion.span
                layoutId="preview-pill"
                className="absolute inset-0 rounded-full bg-sky-300"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{t}</span>
          </button>
        ))}
      </div>

      <div id="preview-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-64">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "Problems" && (
              <ul>
                {problems.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 border-b border-white/5 py-3 text-sm">
                    <span className="w-8 font-mono text-slate-400">{p.id}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-100">{p.title}</span>
                    <span className="hidden font-mono text-slate-400 sm:inline">{p.rate}%</span>
                    <span className={p.level === "Easy" ? "text-emerald-300" : p.level === "Medium" ? "text-amber-300" : "text-rose-300"}>
                      {p.level}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {tab === "Contest" && (
              <div className="py-4">
                <p className="font-mono text-xs tracking-widest text-sky-300 uppercase">Live now</p>
                <p className="mt-2 text-2xl text-white">Weekly Sprint 88</p>
                <p className="mt-6 font-mono text-5xl text-white tabular-nums sm:text-6xl">01:12:44</p>
                <p className="mt-6 text-sm text-slate-300">4 problems. 412 coders in the room. Rated for everyone.</p>
              </div>
            )}
            {tab === "Leaderboard" && (
              <ol>
                {leaders.map((l, i) => (
                  <li key={l.name} className="py-2.5 text-sm">
                    <div className="flex gap-4">
                      <span className="w-6 font-mono text-slate-400">{l.rank}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-100">{l.name}</span>
                      <span className="font-mono text-slate-300">{l.score}</span>
                    </div>
                    <motion.div
                      aria-hidden="true"
                      className="mt-2 h-px origin-left bg-sky-300"
                      style={{ width: `${l.score / 1000}%` }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
