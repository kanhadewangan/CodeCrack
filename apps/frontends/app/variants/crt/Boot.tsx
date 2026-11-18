"use client";

import { motion, useReducedMotion } from "motion/react";

/** Lines wipe in left-to-right, one after another, like a terminal printing. Text is always in the DOM. */
export function TypeLines({
  lines,
  className,
  step = 0.4,
}: {
  lines: readonly string[];
  className?: string;
  step?: number;
}) {
  const reduce = useReducedMotion();
  const d = reduce ? 0 : step;
  return (
    <motion.ul
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: d } } }}
    >
      {lines.map((line) => (
        <motion.li
          key={line}
          className="whitespace-pre-wrap"
          variants={{ hidden: { clipPath: "inset(0 100% 0 0)" }, show: { clipPath: "inset(0 0% 0 0)" } }}
          transition={{ duration: d, ease: "linear" }}
        >
          {line}
        </motion.li>
      ))}
    </motion.ul>
  );
}
