"use client";

import { motion, useScroll } from "motion/react";

/** Reading-progress rule pinned to the top edge; driven directly by the user's scroll. */
export function ProgressRule() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-40 h-1.5 origin-left bg-[#d7331a]"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
