"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { authService } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@shantel.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your work email and password to continue.");
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.login({ email: email.trim(), password });
      router.push("/dashboard");
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "We could not sign you in. Check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1ec] text-[#17221f]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(500px,1.12fr)_minmax(420px,0.88fr)]">
        <section className="relative hidden overflow-hidden bg-[#17221f] px-12 py-10 text-[#f4f1ec] lg:flex lg:flex-col lg:justify-between xl:px-20">
          <video className="absolute inset-0 h-full w-full object-cover opacity-75" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
            <source src="/login_background.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[#17221f]/48" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#17221f]/70 via-[#17221f]/25 to-[#ad6742]/20" />
          <div className="absolute bottom-20 left-0 h-px w-2/3 bg-[#e8a36b]/40" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-[#e8a36b] text-[#17221f]">
              <Activity size={21} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.2em]">SHANTEL</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#f4f1ec]/55">Sales operations</p>
            </div>
          </div>

          <div className="relative z-10 max-w-lg">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-[#e8a36b]">One clear view of the business</p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-0.04em] xl:text-6xl">
              Move stock.<br />
              Close sales.<br />
              Stay in control.
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-[#f4f1ec]/65">
              Your operating desk for sales, inventory, purchasing, projects, and the decisions that keep the day moving.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-[#f4f1ec]/15 pt-6 text-xs text-[#f4f1ec]/55">
            <div>
              <ShieldCheck size={17} className="mb-3 text-[#e8a36b]" />
              <p>Role-aware access</p>
              <p>Built for accountable teams</p>
            </div>
            <div>
              <Activity size={17} className="mb-3 text-[#e8a36b]" />
              <p>Live operational signals</p>
              <p>Decisions without guesswork</p>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-20">
          <div className="w-full max-w-sm">
            <div className="mb-12 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center bg-[#17221f] text-[#e8a36b]"><Activity size={21} /></div>
              <p className="text-sm font-semibold tracking-[0.2em]">SHANTEL</p>
            </div>

            <div className="mb-10">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">Welcome back</p>
              <h2 className="text-4xl font-semibold tracking-[-0.04em] text-[#17221f]">Sign in to your desk.</h2>
              <p className="mt-3 text-sm leading-6 text-[#17221f]/55">Use your Shantel account to pick up where the business is moving.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#17221f]/60">Work email</span>
                <span className="flex items-center border-b border-[#17221f]/20 transition-colors focus-within:border-[#ad6742]">
                  <Mail size={18} className="mr-3 text-[#17221f]/40" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#17221f]/30"
                    placeholder="you@company.com"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#17221f]/60">Password</span>
                <span className="flex items-center border-b border-[#17221f]/20 transition-colors focus-within:border-[#ad6742]">
                  <LockKeyhole size={18} className="mr-3 text-[#17221f]/40" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#17221f]/30"
                    placeholder="Enter your password"
                  />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="p-2 text-[#17221f]/45 transition-colors hover:text-[#17221f]" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>

              {error && (
                <div className="flex items-start gap-3 border border-[#ad6742]/30 bg-[#ad6742]/8 px-4 py-3 text-sm text-[#8a4931]" role="alert">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="group flex h-14 w-full items-center justify-between bg-[#17221f] px-5 text-sm font-semibold text-[#f4f1ec] transition-colors hover:bg-[#263631] disabled:cursor-wait disabled:opacity-60">
                <span>{isSubmitting ? "Signing you in..." : "Enter workspace"}</span>
                <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            <p className="mt-10 text-center text-xs text-[#17221f]/40">Protected workspace for Shantel teams</p>
          </div>
        </section>
      </div>
    </main>
  );
}