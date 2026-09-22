"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// ============================================================================
// STATE MACHINE
// ============================================================================
type OTPStatus =
  | "idle"
  | "complete"
  | "loading"
  | "success"
  | "merging"
  | "burst"
  | "verified"
  | "error";

interface AnimatedOTPProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: () => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export interface AnimatedOTPRef {
  startLoading: () => void;
  startSuccessAnimation: () => void;
  startErrorAnimation: () => void;
}

export const AnimatedOTP = forwardRef<AnimatedOTPRef, AnimatedOTPProps>(({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  className = "",
}, ref) => {
  const [status, setStatus] = useState<OTPStatus>("idle");
  const [verifiedDigits, setVerifiedDigits] = useState<boolean[]>(Array(6).fill(false));
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const digits = value.split("");
  const isComplete = digits.length === 6;

  // ============================================================================
  // DIGIT ENTRY ANIMATION
  // ============================================================================
  const handleDigitChange = (index: number, newValue: string) => {
    if (disabled) return;
    
    const newDigits = [...digits];
    newDigits[index] = newValue;
    const newValueStr = newDigits.join("");
    
    onChange(newValueStr);
    
    if (newValueStr.length === 6 && status === "idle") {
      setStatus("complete");
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (e.key === "Backspace" && !digits[index]) {
      // Move to previous box
      if (index > 0) {
        const prevIndex = index - 1;
        const newDigits = [...digits];
        newDigits[prevIndex] = "";
        onChange(newDigits.join(""));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      onChange(pastedData);
      if (pastedData.length === 6 && status === "idle") {
        setStatus("complete");
      }
    }
  };

  // ============================================================================
  // SUBMIT HANDLER
  // ============================================================================
  useEffect(() => {
    if (isComplete && status === "complete") {
      // Let parent component handle verification
      onComplete();
    }
  }, [isComplete, status, onComplete]);

  // ============================================================================
  // PUBLIC METHODS FOR PARENT COMPONENT
  // ============================================================================
  const startLoading = () => {
    // Loading handled by parent component's overlay
  };

  const startSuccessAnimation = () => {
    setStatus("success");
    // Phase A: Validation glow (300ms)
    setTimeout(() => {
      setStatus("merging");
      // Phase B: Boxes connect with magnetic pull (800ms)
      setTimeout(() => {
        setStatus("burst");
        // Phase C: Dramatic burst with particles (700ms)
        setTimeout(() => {
          setStatus("verified");
          // Phase D: Checkmark (500ms)
        }, 700);
      }, 800);
    }, 300);
  };

  const startErrorAnimation = () => {
    setStatus("error");
    setTimeout(() => {
      setStatus("idle");
    }, 500);
  };

  // Expose methods via ref for parent component
  useImperativeHandle(ref, () => ({
    startLoading,
    startSuccessAnimation,
    startErrorAnimation,
  }));

  // ============================================================================
  // ANIMATION VARIANTS
  // ============================================================================
  const digitVariants = {
    hidden: { opacity: 0, scale: 0.75, y: 8 },
    visible: (prefersReducedMotion: boolean) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        stiffness: 500,
        damping: 30,
        duration: prefersReducedMotion ? 0 : 0.3,
      },
    }),
  };

  const boxVariants = {
    idle: {
      scale: 1,
      borderColor: "var(--brand-amber)",
      backgroundColor: "var(--surface)",
    },
    success: {
      scale: 1.1,
      borderColor: "var(--success)",
      backgroundColor: "var(--status-success-surface)",
      boxShadow: "0 0 20px rgba(22, 131, 91, 0.4)",
      transition: { duration: 0.3 },
    },
    merging: (index: number) => ({
      x: index < 3 ? (index - 1.5) * 5 : (index - 4.5) * 5,
      scale: 1.05,
      rotate: index < 3 ? 5 : -5,
      borderColor: "var(--success)",
      backgroundColor: "var(--status-success-surface)",
      transition: {
        stiffness: 200,
        damping: 20,
        duration: prefersReducedMotion ? 0 : 0.8,
      },
    }),
    error: {
      x: [0, -8, 8, -8, 8, -4, 4, 0],
      borderColor: "var(--danger)",
      backgroundColor: "var(--status-danger-surface)",
      transition: { duration: 0.4 },
    },
  };

  const containerVariants = {
    idle: { gap: "8px" },
    merging: {
      gap: "0px",
      scale: 1.1,
      transition: {
        stiffness: 400,
        damping: 20,
        duration: prefersReducedMotion ? 0 : 0.8,
      },
    },
  };

  const mergedVariants = {
    merged: {
      borderRadius: "12px",
      backgroundColor: "var(--status-success-surface)",
      borderColor: "var(--success)",
      boxShadow: "0 0 30px rgba(22, 131, 91, 0.5)",
      transition: {
        stiffness: 200,
        damping: 20,
        duration: prefersReducedMotion ? 0 : 0.4,
      },
    },
    morphing: {
      width: "120px",
      height: "48px",
      borderRadius: "24px",
      scale: [1, 1.2, 0.8],
      rotate: [0, 10, -10, 0],
      transition: {
        stiffness: 150,
        damping: 15,
        duration: prefersReducedMotion ? 0 : 0.5,
      },
    },
  };

  const particleVariants = {
    hidden: { scale: 0, opacity: 0, rotate: 0 },
    visible: (i: number) => ({
      scale: [0, 1.5, 1],
      opacity: [0, 1, 0.8],
      x: Math.cos((i / 16) * Math.PI * 2) * 70,
      y: Math.sin((i / 16) * Math.PI * 2) * 70,
      rotate: i * 45,
      transition: {
        stiffness: 300,
        damping: 15,
        delay: i * 0.025,
        duration: prefersReducedMotion ? 0 : 0.5,
      },
    }),
    exit: {
      scale: 0,
      opacity: 0,
      transition: { duration: 0.3 },
    },
  };

  const checkmarkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { stiffness: 100, damping: 15, duration: 0.6 },
        opacity: { duration: 0.3 },
      },
    },
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* OTP Input */}
      <AnimatePresence mode="wait">
        {status !== "verified" && (
          <motion.div
            key="otp-container"
            variants={containerVariants}
            initial="idle"
            animate={status === "merging" ? "merging" : "idle"}
            className="flex justify-center"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={index}
                variants={boxVariants}
                initial="idle"
                animate={
                  status === "merging"
                    ? "merging"
                    : status === "success"
                    ? "success"
                    : status === "error"
                    ? "error"
                    : "idle"
                }
                custom={index}
                className="relative"
              >
                <motion.div
                  variants={digitVariants}
                  initial="hidden"
                  animate="visible"
                  custom={prefersReducedMotion}
                  key={digits[index] || `empty-${index}`}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digits[index] || ""}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled || status !== "idle"}
                    className={`w-12 h-12 text-center text-2xl font-mono border rounded-md focus:outline-none focus:ring-2 transition-all
                      ${error ? "border-status-danger-border focus:border-status-danger-border focus:ring-status-danger-border" : "border-brand-amber focus:border-brand-amber focus:ring-brand-amber"}
                      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                      ${status === "success" ? "border-status-success-border bg-status-success-surface" : ""}
                      ${status === "error" ? "border-status-danger-border bg-status-danger-surface" : ""}
                    `}
                    style={{
                      backgroundColor: "var(--surface)",
                    }}
                  />
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merged State */}
      <AnimatePresence>
        {status === "merging" && (
          <motion.div
            key="merged-state"
            variants={mergedVariants}
            initial="merged"
            animate="morphing"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{
              width: "300px",
              height: "48px",
              border: "2px solid var(--success)",
              backgroundColor: "var(--status-success-surface)",
            }}
          >
            <span className="text-2xl font-mono font-semibold" style={{ color: "var(--status-success-text)" }}>
              {value}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Burst */}
      <AnimatePresence>
        {status === "burst" && (
          <motion.div
            key="burst"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            {/* Central Object */}
            <motion.div
              initial={{ scale: 0.5, rotate: -180 }}
              animate={{ scale: [0.5, 1.5, 1], rotate: [-180, 0, 15, -15, 0] }}
              transition={{ duration: 0.6 }}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "var(--status-success-surface)",
                border: "4px solid var(--success)",
                boxShadow: "0 0 40px rgba(22, 131, 91, 0.6)",
              }}
            >
              <motion.svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--status-success-text)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={checkmarkVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.path d="M5 13l4 4L19 7" variants={checkmarkVariants} />
              </motion.svg>
            </motion.div>

            {/* Particles */}
            {!prefersReducedMotion && (
              <>
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    variants={particleVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: "var(--brand-amber)",
                      left: "50%",
                      top: "50%",
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verified State */}
      <AnimatePresence>
        {status === "verified" && (
          <motion.div
            key="verified"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          >
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "var(--status-success-surface)",
                border: "3px solid var(--success)",
              }}
            >
              <motion.svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--status-success-text)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
              >
                <path d="M5 13l4 4L19 7" />
              </motion.svg>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mt-4 text-sm font-semibold"
              style={{ color: "var(--status-success-text)" }}
            >
              Verified
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "var(--surface)",
                border: "2px solid var(--brand-amber)",
              }}
            >
              <motion.div
                className="w-8 h-8 rounded-full"
                style={{
                  backgroundColor: "var(--brand-amber)",
                  opacity: 0.3,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

AnimatedOTP.displayName = "AnimatedOTP";