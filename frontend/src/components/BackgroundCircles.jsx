import { motion } from "framer-motion";
import clsx from "clsx";

const COLOR_VARIANTS = {
  stable: {
    border: [
      "border-emerald-500/40",
      "border-cyan-400/30",
      "border-slate-600/20",
    ],
    gradient: "from-emerald-500/20",
    glow: "bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_70%)]",
  },
  "at-risk": {
    border: [
      "border-orange-500/40",
      "border-yellow-400/30",
      "border-slate-600/20",
    ],
    gradient: "from-orange-500/20",
    glow: "bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.15),transparent_70%)]",
  },
  critical: {
    border: [
      "border-red-500/40",
      "border-rose-400/30",
      "border-slate-600/20",
    ],
    gradient: "from-red-500/20",
    glow: "bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.15),transparent_70%)]",
  },
};

const AnimatedGrid = () => (
  <motion.div
    className="absolute inset-0 opacity-30"
    animate={{
      backgroundPosition: ["0% 0%", "100% 100%"],
    }}
    transition={{
      duration: 40,
      repeat: Infinity,
      ease: "linear",
    }}
  >
    <div className="h-full w-full [background-image:repeating-linear-gradient(100deg,#64748B_0%,#64748B_1px,transparent_1px,transparent_4%)]" />
  </motion.div>
);

export function BackgroundCircles({ variant = "stable", className }) {
  const variantStyles = COLOR_VARIANTS[variant] || COLOR_VARIANTS.stable;

  return (
    <div className={clsx("absolute inset-0 overflow-hidden", className)}>
      <AnimatedGrid />
      
      <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 md:h-64 md:w-64">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={clsx(
              "absolute inset-0 rounded-full",
              "border bg-gradient-to-br to-transparent",
              variantStyles.border[i],
              variantStyles.gradient
            )}
            animate={{
              rotate: 360,
              scale: [1, 1.05 + i * 0.05, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      <div className="absolute inset-0 [mask-image:radial-gradient(70%_70%_at_50%_50%,#000_30%,transparent)]">
        <div className={clsx("absolute inset-0 blur-[80px]", variantStyles.glow)} />
      </div>
    </div>
  );
}
