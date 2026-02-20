"use client";

import { useMemo, useRef, useEffect } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

const PATTERN = [
  "K_K_K___________R___________K_K_K",
  "_K_K___________RRR___________K_K_",
  "K_K_K_________RRRRR_________K_K_K",
  "_K_K_________RRR_RRR_________K_K_",
  "K_K_________RRR___RRR_________K_K",
  "___________RRR_____RRR___________",
  "__________RRR_______RRR__________",
  "_________RRR____K____RRR_________",
  "________RRR____KKK____RRR________",
  "_______RRR____KK_KK____RRR_______",
  "______RRR____KK___KK____RRR______",
  "_____RRR____KK_____KK____RRR_____",
  "____RRR____KK_______KK____RRR____",
  "___RRR____KK____K____KK____RRR___",
  "__RRR____KK____KKK____KK____RRR__",
  "_RRR____KK____KK_KK____KK____RRR_",
  "RRRRRRRRRRRRRRR___RRRRRRRRRRRRRRR",
  "_RRR____KK____KK_KK____KK____RRR_",
  "__RRR____KK____KKK____KK____RRR__",
  "___RRR____KK____K____KK____RRR___",
  "____RRR____KK_______KK____RRR____",
  "_____RRR____KK_____KK____RRR_____",
  "______RRR____KK___KK____RRR______",
  "_______RRR____KK_KK____RRR_______",
  "________RRR____KKK____RRR________",
  "_________RRR____K____RRR_________",
  "__________RRR_______RRR__________",
  "___________RRR_____RRR___________",
  "K_K_________RRR___RRR_________K_K",
  "_K_K_________RRR_RRR_________K_K_",
  "K_K_K_________RRRRR_________K_K_K",
  "_K_K___________RRR___________K_K_",
  "K_K_K___________R___________K_K_K",
];

export function VyshyvankaOrnament() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse position values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for the mouse movement
  const springConfig = { damping: 25, stiffness: 150, mass: 0.5 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // 3D rotation transforms based on mouse position
  const rotateX = useTransform(smoothMouseY, [-1, 1], [15, -15]);
  const rotateY = useTransform(smoothMouseX, [-1, 1], [-15, 15]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();

      // Calculate normalized mouse position (-1 to 1) relative to container center
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const normalizedX = (e.clientX - centerX) / (rect.width / 2);
      const normalizedY = (e.clientY - centerY) / (rect.height / 2);

      // Clamp values between -1 and 1
      mouseX.set(Math.max(-1, Math.min(1, normalizedX)));
      mouseY.set(Math.max(-1, Math.min(1, normalizedY)));
    };

    const handleMouseLeave = () => {
      // Reset to center when mouse leaves
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mouseX, mouseY]);

  const cells = useMemo(() => {
    const result = [];
    for (let y = 0; y < PATTERN.length; y++) {
      for (let x = 0; x < PATTERN[y].length; x++) {
        const char = PATTERN[y][x];
        if (char === "R" || char === "K") {
          result.push({ x, y, type: char });
        }
      }
    }
    return result;
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#faf6f0] dark:bg-stone-950 flex items-center justify-center"
      style={{ perspective: "1000px" }}
    >
      {/* Subtle fabric noise */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <motion.div
        className="relative w-full max-w-[80%] aspect-square max-h-[80%] flex items-center justify-center pointer-events-none"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      >
        <svg
          viewBox="0 0 33 33"
          className="w-full h-full drop-shadow-xl"
          style={{
            filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.15))",
            overflow: "visible",
          }}
        >
          {cells.map((cell) => {
            const isRed = cell.type === "R";
            const colorClass = isRed
              ? "stroke-red-600 dark:stroke-red-500"
              : "stroke-stone-900 dark:stroke-stone-200";

            // Calculate distance from center for staggered animation and parallax
            const dx = cell.x - 16;
            const dy = cell.y - 16;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const delay = dist * 0.04;

            // Create a parallax effect based on distance from center
            // Outer elements move more than inner elements
            const parallaxFactor = 1 + dist * 0.15;

            return (
              <StitchCell
                key={`${cell.x}-${cell.y}`}
                cell={cell}
                colorClass={colorClass}
                delay={delay}
                mouseX={smoothMouseX}
                mouseY={smoothMouseY}
                parallaxFactor={parallaxFactor}
              />
            );
          })}
        </svg>
      </motion.div>

      {/* Vignette overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/30 pointer-events-none" />
    </div>
  );
}

function StitchCell({
  cell,
  colorClass,
  delay,
  mouseX,
  mouseY,
  parallaxFactor,
}: {
  cell: { x: number; y: number };
  colorClass: string;
  delay: number;
  mouseX: any;
  mouseY: any;
  parallaxFactor: number;
}) {
  // Calculate individual cell translation based on mouse position and parallax factor
  const x = useTransform(mouseX, [-1, 1], [-parallaxFactor, parallaxFactor]);
  const y = useTransform(mouseY, [-1, 1], [-parallaxFactor, parallaxFactor]);

  return (
    <g transform={`translate(${cell.x}, ${cell.y})`}>
      <motion.g style={{ x, y }}>
        <motion.path
          d="M0.2,0.2 L0.8,0.8 M0.8,0.2 L0.2,0.8"
          className={colorClass}
          strokeWidth="0.3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0, scale: 0 }}
          animate={{ pathLength: 1, opacity: 1, scale: 1 }}
          transition={{
            duration: 1.2,
            delay: delay,
            ease: [0.23, 1, 0.32, 1], // Custom spring-like easing
          }}
        />
      </motion.g>
    </g>
  );
}
