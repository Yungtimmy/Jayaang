"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

type AnimatedCounterProps = {
  value: number;
  decimals?: number;
  suffix?: string;
};

export function AnimatedCounter({ value, decimals = 0, suffix }: AnimatedCounterProps) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  const [text, setText] = useState("0");

  useEffect(() => {
    spring.set(value);
    return display.on("change", (v) => setText(v));
  }, [value, spring, display]);

  return (
    <motion.span>
      {text}
      {suffix && <span className="ml-1 text-lg text-muted">{suffix}</span>}
    </motion.span>
  );
}