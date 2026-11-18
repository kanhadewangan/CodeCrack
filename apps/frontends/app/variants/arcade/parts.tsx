"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/** Logo letters fall in and bounce, one after another. */
export function Drop({ children, index }: { children: ReactNode; index: number }) {
  return (
    <motion.span
      className="block"
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.15 + index * 0.07 }}
    >
      {children}
    </motion.span>
  );
}

/** Springy pop-in on scroll, wiggle on hover. */
export function Pop({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0.7, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      whileHover={{ rotate: [0, -2, 2, 0], transition: { duration: 0.35 } }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ type: "spring", stiffness: 300, damping: 16, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Marches its children across the parent, left to right, forever. Parked mid-screen for reduced motion. */
export function Walker({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className="absolute bottom-0 left-0 w-14 sm:w-20"
      initial={{ x: "-12vw" }}
      animate={reduce ? { x: "70vw" } : { x: ["-12vw", "104vw"] }}
      transition={reduce ? { duration: 0 } : { duration: 16, ease: "linear", repeat: Infinity }}
    >
      {children}
    </motion.div>
  );
}

/** Score that rolls up from zero when it scrolls into view. Screen readers get the real number. */
export function Score({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const text = useTransform(count, (v) => String(Math.round(v)).padStart(6, "0"));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration: reduce ? 0 : 1.6, ease: "easeOut" });
    return () => controls.stop();
  }, [inView, reduce, count, value]);

  return (
    <span ref={ref}>
      <span className="sr-only">{value} points</span>
      <motion.span aria-hidden="true">{text}</motion.span>
    </span>
  );
}
