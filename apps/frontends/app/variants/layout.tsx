import type { ReactNode } from "react";
import "./variants.css";
import { MotionRoot } from "./_components/motion";

export default function VariantsLayout({ children }: { children: ReactNode }) {
  return <MotionRoot>{children}</MotionRoot>;
}
