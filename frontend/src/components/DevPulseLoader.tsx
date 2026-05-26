import { motion } from "framer-motion";

export function DevPulseLoader({ size = 80, text = "Analyzing engineering patterns..." }: { size?: number; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Pulsing Grid Background */}
        <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-40">
          <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" className="text-border">
            <defs>
              <pattern id="loader-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#loader-grid)" />
            {/* Pulsing radial glow */}
            <motion.circle
              cx="50"
              cy="50"
              r="30"
              fill="none"
              stroke="#BEF264"
              strokeWidth="0.5"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.1, 0.4, 0.1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </svg>
        </div>

        {/* Brand Pulsing Circle in Center */}
        <motion.div
          className="absolute inset-0 m-auto rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center shadow-inner"
          style={{ width: size * 0.8, height: size * 0.8 }}
          animate={{
            boxShadow: [
              "inset 0 0 12px rgba(190, 242, 100, 0.1)",
              "inset 0 0 20px rgba(96, 165, 250, 0.2)",
              "inset 0 0 12px rgba(190, 242, 100, 0.1)"
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Heartbeat EKG Path */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          className="absolute inset-0 z-10"
        >
          <defs>
            <linearGradient id="heartbeat-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#BEF264" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 10 50 L 35 50 L 40 40 L 45 65 L 50 20 L 55 75 L 60 45 L 65 50 L 90 50"
            fill="none"
            stroke="url(#heartbeat-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, pathOffset: 0 }}
            animate={{
              pathLength: [0.15, 0.5, 0.15],
              pathOffset: [0, 0.85, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>
      </div>

      {text && (
        <motion.p
          className="mt-6 font-mono text-xs text-text-muted select-none"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
