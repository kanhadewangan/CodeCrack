"use client";

import { MotionConfig, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

/** reducedMotion="user": Motion drops transform/layout animation when the OS asks for less motion. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fade + rise the first time the element scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Hover-lift / tap-press wrapper for CTAs. */
export function Press({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.span
      className={`inline-block ${className}`}
      whileHover={{ y: -3 }}
      whileTap={{ y: 2, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
    >
      {children}
    </motion.span>
  );
}

/** Words rise out of a mask one after another. The text stays real text. */
export function Words({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: delay } } }}
    >
      {text.split(" ").map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: "110%" }, show: { y: 0 } }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>{" "}
        </span>
      ))}
    </motion.span>
  );
}

/**
 * Runs `frame` on requestAnimationFrame (capped at `fps`) only while the element is on screen
 * and the tab is visible. With reduced motion it draws a single static frame instead.
 */
export function useFrameLoop(ref: RefObject<Element | null>, frame: (ms: number) => void, fps = 30) {
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const cb = useRef(frame);
  useEffect(() => {
    cb.current = frame;
  });
  useEffect(() => {
    if (reduce) {
      cb.current(0);
      return;
    }
    if (!inView) return;
    let raf = 0;
    let last = 0;
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (ms - last < 1000 / fps) return;
      last = ms;
      cb.current(ms);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [inView, reduce, fps]);
}
