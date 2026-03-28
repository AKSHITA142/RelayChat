import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EmailOtpForm({
  email,
  setEmail,
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
}) {
  return (
    <motion.div
      key="email-otp"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="surface-inline rounded-[24px] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-secondary">Email OTP</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We’ll send a 6-digit security code to your email. After verification, you’ll continue through the same trusted-device approval flow.
        </p>
      </div>

      <div className="grid gap-4">
        <Input
          icon={Mail}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={otpSent}
        />

        {otpSent ? (
          <Input
            icon={Send}
            type="text"
            placeholder="6-digit security code"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            maxLength={6}
            className="text-center text-base tracking-[0.4em]"
          />
        ) : null}
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
          <Button variant="outline" onClick={onResend} disabled={loading || Date.now() < canResendAt} className="w-full">
            {Date.now() < canResendAt ? `Resend in ${Math.ceil((canResendAt - Date.now()) / 1000)}s` : "Resend code"}
          </Button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onSwitchMethod}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Prefer email and password instead?
        <ArrowRight size={16} />
      </button>
    </motion.div>
  );
}

