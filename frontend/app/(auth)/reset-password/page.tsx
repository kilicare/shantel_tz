"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, LoaderCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ShantelLogo } from "@/components/ShantelLogo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("reset_email");
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      router.push("/forgot-password");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please enter both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post("/auth/reset-password", { email, password });
      sessionStorage.removeItem("reset_email");
      router.push("/login");
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Failed to reset password. Please try again.");
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
            <p className="mb-6 text-label font-semibold uppercase tracking-wider text-brand-amber">Password Reset</p>
            <h1 className="max-w-xl text-display font-semibold tracking-tight xl:text-display">
              Set your new<br />
              secure password
            </h1>
            <p className="mt-7 max-w-md text-body leading-relaxed text-primary-foreground/70">
              Create a strong password to secure your account. Make it unique and memorable.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-border-subtle pt-6 text-caption text-primary-foreground/70">
            <div>
              <LockKeyhole size={18} className="mb-3 text-brand-amber" />
              <p>Strong encryption</p>
              <p>Secure storage</p>
            </div>
            <div>
              <ShantelLogo variant="icon-full" size={34} className="mb-3 h-[34px] w-[34px] text-brand-amber" />
              <p>Secure reset</p>
              <p>Verified recovery</p>
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
              <p className="mb-3 text-label font-semibold uppercase tracking-wider text-blue-primary">Password Reset</p>
              <h2 className="text-h1 font-semibold tracking-tight text-foreground">New password</h2>
              <p className="mt-3 text-body leading-relaxed text-text-muted">Create a strong password for <strong>{email}</strong></p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-label font-semibold uppercase tracking-wide text-blue-primary">New password</span>
                <span className={`flex items-center rounded-md border bg-surface px-3 transition-colors focus-within:border-brand-amber ${error ? "border-status-danger-border focus-within:border-status-danger-border" : "border-brand-amber"}`}>
                  <LockKeyhole size={18} className="mr-3 text-brand-amber" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "error" : undefined}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 w-full bg-transparent text-body outline-none placeholder:text-text-muted"
                    placeholder="At least 8 characters"
                  />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="p-2 text-text-muted transition-colors hover:text-text-primary" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-muted">Confirm password</span>
                <span className={`flex items-center rounded-md border bg-surface px-3 transition-colors focus-within:border-brand-amber ${error ? "border-status-danger-border focus-within:border-status-danger-border" : "border-brand-amber"}`}>
                  <LockKeyhole size={18} className="mr-3 text-brand-amber" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 w-full bg-transparent text-body outline-none placeholder:text-text-muted"
                    placeholder="Re-enter password"
                  />
                </span>
              </label>

              {error && (
                <div id="error" className="flex items-start gap-3 rounded-md border border-status-danger-border bg-status-danger-surface px-4 py-3 text-body text-status-danger-text" role="alert">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="group flex h-11 w-full items-center justify-between rounded-md border border-brand-amber bg-brand-primary px-5 text-label font-semibold text-primary-foreground transition-colors hover:bg-brand-primary-hover hover:border-brand-amber disabled:cursor-wait disabled:opacity-60 relative overflow-hidden">
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="animate-spin text-brand-amber" size={20} />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <span>Reset password</span>
                    <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <div className="text-center">
                <a href="/login" className="text-body text-blue-primary hover:underline">
                  Back to login
                </a>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
