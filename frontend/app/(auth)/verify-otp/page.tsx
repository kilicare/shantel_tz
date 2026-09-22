"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ShantelLogo } from "@/components/ShantelLogo";
import { AnimatedOTP, AnimatedOTPRef } from "@/components/auth/AnimatedOTP";

export default function VerifyOTPPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const otpRef = useRef<AnimatedOTPRef>(null);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("reset_email");
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      router.push("/forgot-password");
    }
  }, [router]);

  async function handleOTPComplete() {
    if (!otp.trim() || !email.trim()) {
      setError("Please enter the OTP code and your email.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      
      // Start loading animation
      if (otpRef.current) {
        otpRef.current.startLoading();
      }

      await apiClient.post("/auth/verify-otp", { email: email.trim(), otp: otp.trim() });
      
      // Start success animation
      if (otpRef.current) {
        otpRef.current.startSuccessAnimation();
      }

      // Wait for animation to complete before navigation
      setTimeout(() => {
        // Store email for next step
        sessionStorage.setItem("reset_email", email.trim());
        router.push("/reset-password");
      }, 2000); // 2s for animation sequence
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Invalid OTP. Please try again.");
      
      // Start error animation
      if (otpRef.current) {
        otpRef.current.startErrorAnimation();
      }
      
      // Don't clear OTP - let user see what they entered and modify it
      // Stay on this page - don't redirect
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[minmax(500px,1.12fr)_minmax(420px,0.88fr)]">
        <section className="relative hidden overflow-hidden bg-brand-primary px-12 py-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:px-20">
          <video className="absolute inset-0 h-full w-full object-cover opacity-75" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
            <source src="/login_background.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-brand-primary/48" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/70 via-brand-primary/25 to-brand-primary/20" />
          <div className="absolute bottom-20 left-0 h-px w-2/3 bg-border-subtle" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-amber text-foreground">
              <ShantelLogo variant="icon-full" size={40} className="h-10 w-10" />
            </div>
            <div>
              <p className="text-body font-semibold tracking-wider">SHANTEL</p>
              <p className="text-caption uppercase tracking-wide text-primary-foreground/70">Sales operations</p>
            </div>
          </div>

          <div className="relative z-10 max-w-lg">
            <p className="mb-6 text-label font-semibold uppercase tracking-wider text-brand-amber">OTP Verification</p>
            <h1 className="max-w-xl text-display font-semibold tracking-tight xl:text-display">
              Enter the code<br />
              from your email
            </h1>
            <p className="mt-7 max-w-md text-body leading-relaxed text-primary-foreground/70">
              Check your inbox for the one-time password we sent. Enter it below to verify your identity.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-border-subtle pt-6 text-caption text-primary-foreground/70">
            <div>
              <ShieldCheck size={18} className="mb-3 text-brand-amber" />
              <p>Secure verification</p>
              <p>Time-limited code</p>
            </div>
            <div>
              <ShantelLogo variant="icon-full" size={34} className="mb-3 h-[34px] w-[34px] text-brand-amber" />
              <p>One-time use</p>
              <p>Auto-expiring</p>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-background px-6 py-10 sm:px-12 lg:px-16 xl:px-20">
          <div className="w-full max-w-sm">
            <div className="mb-12 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-brand-amber"><ShantelLogo variant="icon-full" size={40} className="h-10 w-10" /></div>
              <p className="text-body font-semibold tracking-wider">SHANTEL</p>
            </div>

            <div className="mb-10">
              <p className="mb-3 text-label font-semibold uppercase tracking-wider text-blue-primary">OTP Verification</p>
              <h2 className="text-h1 font-semibold tracking-tight text-foreground">Enter your code</h2>
              <p className="mt-3 text-body leading-relaxed text-text-muted">Enter the 6-digit code sent to your email.</p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-label font-semibold uppercase tracking-wide text-blue-primary">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-md border border-brand-amber bg-surface px-3 text-body outline-none focus:border-brand-amber placeholder:text-text-muted"
                  placeholder="you@company.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-muted">OTP Code</span>
                <div className="flex justify-center py-4">
                  <AnimatedOTP
                    ref={otpRef}
                    value={otp}
                    onChange={setOtp}
                    onComplete={handleOTPComplete}
                    disabled={isSubmitting}
                    error={!!error}
                    className="relative"
                  />
                </div>
              </label>

              {error && (
                <div className="flex items-start gap-3 rounded-md border border-status-danger-border bg-status-danger-surface px-4 py-3 text-body text-status-danger-text" role="alert">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting || otp.length !== 6} 
                className="group flex h-11 w-full items-center justify-between rounded-md border border-brand-amber bg-brand-primary px-5 text-label font-semibold text-primary-foreground transition-colors hover:bg-brand-primary-hover hover:border-brand-amber disabled:cursor-wait disabled:opacity-60"
                onClick={(e) => {
                  e.preventDefault();
                  if (otp.length === 6 && !isSubmitting) {
                    handleOTPComplete();
                  }
                }}
              >
                <span>{isSubmitting ? "Verifying..." : "Verify OTP"}</span>
                <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
              </button>

              <div className="text-center">
                <a href="/forgot-password" className="text-body text-blue-primary hover:underline">
                  Resend OTP
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
