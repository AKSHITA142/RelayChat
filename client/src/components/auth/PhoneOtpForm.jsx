import { CheckCircle, Loader2, Lock, Mail, Phone, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PhoneOtpForm({
  phone,
  setPhone,
  otp,
  setOtp,
  otpSent,
  canResume,
  canResendAt,
  loading,
  onPrimaryAction,
  onResumeSession,
  onResend,
  onSwitchMethod,
  isRegistering,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  onCompleteRegistration,
  onCancelRegistration,
}) {
  return (
    <div className="space-y-5">
      {isRegistering ? (
        <div className="space-y-5">
          <div className="surface-inline rounded-[24px] p-4">
            <div className="section-badge">
              <CheckCircle size={12} />
              Phone verified
            </div>
            <div className="mt-4 space-y-2">
              <p className="font-headline text-xl font-bold tracking-tight text-foreground">Finish your identity card</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Add the details that make this account feel like yours. Email and password remain optional.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <Input icon={User} type="text" placeholder="Full name" value={name} onChange={(event) => setName(event.target.value)} />
            <Input icon={Mail} type="email" placeholder="Email (optional)" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input
              icon={Lock}
              type="password"
              placeholder="Password (optional)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={onCompleteRegistration} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : "Complete setup"}
            </Button>
            <Button variant="outline" onClick={onCancelRegistration} className="w-full">
              Start over
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex w-full items-center overflow-hidden rounded-lg border border-input bg-card/70 transition-all focus-within:ring-2 focus-within:ring-ring">
            <span className="border-r border-input bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary select-none whitespace-nowrap">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Enter 10-digit number"
              value={phone.replace(/^\+91/, "")}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone("+91" + digits);
              }}
              disabled={otpSent}
              maxLength={10}
              className="flex-1 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none tracking-widest"
            />
            <span className="px-3 text-xs font-bold text-muted-foreground tabular-nums">{phone.replace(/^\+91/, "").length}/10</span>
          </div>

          <div className="grid gap-4">
            {otpSent && (
              <div className="overflow-hidden">
                <Input
                  icon={Send}
                  type="text"
                  placeholder="6-digit security code"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  maxLength={6}
                  className="text-center text-base tracking-[0.4em]"
                />
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <Button onClick={onPrimaryAction} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : otpSent ? "Verify and continue" : "Send security code"}
            </Button>

            {canResume && !otpSent ? (
              <Button variant="outline" onClick={onResumeSession} disabled={loading} className="w-full">
                Continue with saved session
              </Button>
            ) : null}

            {otpSent ? (
              <Button
                variant="outline"
                onClick={onResend}
                disabled={loading || Date.now() < canResendAt}
                className="w-full"
              >
                {Date.now() < canResendAt
                  ? `Resend in ${Math.ceil((canResendAt - Date.now()) / 1000)}s`
                  : "Resend code"}
              </Button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onSwitchMethod}
            className="w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Prefer email and password instead?
          </button>
        </div>
      )}
    </div>
  );
}
