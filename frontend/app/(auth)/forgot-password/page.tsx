"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Mail } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ShantelLogo } from "@/components/ShantelLogo";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post("/auth/forgot-password", { email: email.trim() });
      // Store email for verify-otp page
      sessionStorage.setItem("reset_email", email.trim());
      setSuccess(true);
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Failed to send password reset email. Please try again.");
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
            <p className="mb-6 text-label font-semibold uppercase tracking-wider text-brand-amber">Password Recovery</p>
            <h1 className="max-w-xl text-display font-semibold tracking-tight xl:text-display">
              Forgot your password?<br />
              Let's get you back in.
            </h1>
            <p className="mt-7 max-w-md text-body leading-relaxed text-primary-foreground/70">
              Enter your email address and we'll send you a one-time password (OTP) to reset your password.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-border-subtle pt-6 text-caption text-primary-foreground/70">
            <div>
              <Mail size={18} className="mb-3 text-brand-amber" />
              <p>Secure email delivery</p>
              <p>OTP verification</p>
            </div>
            <div>
              <ShantelLogo variant="icon-full" size={34} className="mb-3 h-[34px] w-[34px] text-brand-amber" />
              <p>Quick recovery</p>
              <p>Back to work in minutes</p>
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
              <p className="mb-3 text-label font-semibold uppercase tracking-wider text-blue-primary">Password Recovery</p>
              <h2 className="text-h1 font-semibold tracking-tight text-foreground">Reset your password</h2>
              <p className="mt-3 text-body leading-relaxed text-text-muted">Enter your email to receive a recovery code.</p>
            </div>

            {success ? (
              <div className="rounded-md border border-brand-amber bg-brand-amber/10 px-4 py-6 text-center">
                <Mail size={32} className="mx-auto mb-4 text-brand-amber" />
                <h3 className="text-lg font-semibold">Check your email</h3>
                <p className="mt-2 text-body text-text-muted">
                  We've sent a one-time password to <strong>{email}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/verify-otp")}
                  className="mt-6 h-11 w-full rounded-md border border-brand-amber bg-brand-primary px-5 text-label font-semibold text-primary-foreground transition-colors hover:bg-brand-primary-hover"
                >
                  Enter OTP
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-label font-semibold uppercase tracking-wide text-blue-primary">Work email</span>
                  <span className={`flex items-center rounded-md border bg-surface px-3 transition-colors focus-within:border-brand-amber ${error ? "border-status-danger-border focus-within:border-status-danger-border" : "border-brand-amber"}`}>
                    <Mail size={18} className="mr-3 text-blue-primary" />
                    <input
                      type="email"
                      autoComplete="email"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "error" : undefined}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11 w-full bg-transparent text-body outline-none placeholder:text-text-muted"
                      placeholder="you@company.com"
                    />
                  </span>
                </label>

                {error && (
                  <div id="error" className="flex items-start gap-3 rounded-md border border-status-danger-border bg-status-danger-surface px-4 py-3 text-body text-status-danger-text" role="alert">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="group flex h-11 w-full items-center justify-between rounded-md border border-brand-amber bg-brand-primary px-5 text-label font-semibold text-primary-foreground transition-colors hover:bg-brand-primary-hover hover:border-brand-amber disabled:cursor-wait disabled:opacity-60">
                  <span>{isSubmitting ? "Sending..." : "Send OTP"}</span>
                  <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
                </button>

                <div className="text-center">
                  <a href="/login" className="text-body text-blue-primary hover:underline">
                    Back to login
                  </a>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
