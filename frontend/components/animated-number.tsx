"use client";
import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { number } from "@/lib/utils";
export function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return;
    const controls = animate(0, value, {
      duration: 0.4,
      ease: "easeOut",
      onUpdate: (latest) => {
        node.textContent = number(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, reduced]);
  return (
    <span aria-label={number(value)}>
      <span ref={ref} aria-hidden="true">
        {number(value)}
      </span>
    </span>
  );
}
