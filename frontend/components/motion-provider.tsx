"use client";
import { MotionConfig, useReducedMotion } from "framer-motion";
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: reduced ? 0 : 0.25 }}
    >
      {children}
    </MotionConfig>
  );
}
