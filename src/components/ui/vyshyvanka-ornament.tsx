"use client";

import { useId } from "react";
import { motion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// ASCII pixel-art figure wearing a vyshyvanka, with idle breathing animation.
//
// Each character in the FIGURE array is a color code:
//   D = dark silhouette (hair, legs, boots)
//   S = skin (face, neck)
//   R = red embroidery stitch
//   K = dark embroidery stitch (near-black)
//   W = white shirt / sleeves
//   G = gold collar & belt trim
//   (space) = transparent
//
// Every non-space char renders as "█" with the mapped colour.
// Rows are centered via flexbox — no manual padding needed.
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE: Record<string, string> = {
  D: "text-[#2c2520] dark:text-stone-400",
  S: "text-[#e8b87a] dark:text-[#d4a76a]",
  R: "text-[#c41e3a] dark:text-[#e04050]",
  K: "text-[#1a1510] dark:text-stone-300",
  W: "text-[#f0ebe4] dark:text-stone-500",
  G: "text-[#c8952e] dark:text-yellow-500",
};

const FIGURE = [
  // ── head ──
  "       DDDDDDDD",
  "     DDDDDDDDDDDD",
  "    DDDDDDDDDDDDDD",
  "   DDSSSSSSSSSSSSDD",
  "   DSSSSSSSSSSSSSD",
  "   DSSDDSSSSSDDSSSD",
  "   DSSSSSSSSSSSSSD",
  "   DSSSSSDDSSSSSD",
  "    DSSSSSSSSSSSD",
  "     DDSSSSSSDD",
  "       DSSSD",
  "        DSS",
  // ── collar ──
  "    GGGGGGGGGGGGGGG",
  // ── torso (vyshyvanka) ──
  "  WWWWGRKRKRKRKRKRKGWWWW",
  " WWWWWGKRKRKRKRKRKRKGWWWWW",
  " WWWWWGRKRKRKRKRKRKGWWWWW",
  " WWWWWGKRKRKRKRKRKRKGWWWWW",
  " WWWWWGRKRKRKRKRKRKGWWWWW",
  " WWWWWGKRKRKRKRKRKRKGWWWWW",
  " WWWWWGRKRKRKRKRKRKGWWWWW",
  " WWWWWGKRKRKRKRKRKRKGWWWWW",
  "  WWWWGRKRKRKRKRKRKGWWWW",
  "   WWWGKRKRKRKRKRKRKGWWW",
  // ── belt ──
  "    GGGGGGGGGGGGGGG",
  // ── legs ──
  "     DDDDDDDDDDDD",
  "    DDDDDDDDDDDDDD",
  "    DDDDDDD  DDDDDDD",
  "    DDDDDD    DDDDDD",
  "    DDDDD      DDDDD",
  "    DDDD        DDDD",
  "    DDD          DDD",
  // ── boots ──
  "   DDDDD        DDDDD",
  "   DDDDDD      DDDDDD",
];

// Pre-compute per-character metadata at module level
type Cell = { visible: boolean; color: string; isRed: boolean };
const CHARS: Cell[][] = FIGURE.map((line) =>
  line.split("").map((ch) => ({
    visible: ch !== " ",
    color: PALETTE[ch] ?? "",
    isRed: ch === "R",
  })),
);

// ─────────────────────────────────────────────────────────────────────────────

export function VyshyvankaOrnament() {
  const id = useId();
  const pid = `vo${id.replace(/:/g, "")}`;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Scoped animation for the red-stitch pulse */}
      <style>{`
        @keyframes ${pid}-stitch {
          0%, 100% { opacity: .82; }
          50%      { opacity: 1; }
        }
        .${pid}-r { animation: ${pid}-stitch 3s ease-in-out infinite; }
      `}</style>

      {/* Warm linen background */}
      <div className="absolute inset-0 bg-[#faf6f0] dark:bg-stone-950" />

      {/* Subtle fabric noise */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Centered figure with float + sway idle animation */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Ground shadow */}
        <motion.div
          className="absolute rounded-[50%] bg-stone-900/15 dark:bg-stone-400/8 blur-md"
          style={{
            width: "220px",
            height: "18px",
            bottom: "calc(50% - 285px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, scaleX: [1, 0.92, 1] }}
          transition={{
            opacity: { duration: 1.5, ease: "easeOut" },
            scaleX: {
              duration: 3.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            },
          }}
        />

        <motion.div
          className="flex flex-col items-center font-mono leading-none"
          style={{ fontSize: "clamp(8px, 1.8vh, 18px)" }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [0, -6, 0] }}
          transition={{
            opacity: { duration: 1.5, ease: "easeOut" },
            y: {
              duration: 3.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 1.5,
            },
          }}
        >
          {CHARS.map((row, ri) => (
            <div key={ri} className="flex justify-center">
              {row.map((cell, ci) => (
                <span
                  key={ci}
                  className={`inline-block text-center ${cell.color}${cell.isRed ? ` ${pid}-r` : ""}`}
                  style={{ width: "1ch" }}
                >
                  {cell.visible ? "\u2588" : "\u00A0"}
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Vignette overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/30" />
    </div>
  );
}
