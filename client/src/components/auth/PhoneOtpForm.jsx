import { AnimatePresence, motion } from "framer-motion";
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
    <AnimatePresence mode="wait">
      {isRegistering ? (
        <motion.div
          key="register-profile"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-5"
        >
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
        </motion.div>
      ) : (
        <motion.div
          key="phone-otp"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-5"
        >
          <div className="surface-inline rounded-[24px] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Quick secure entry</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Enter your phone number and RelayChat will send a one-time security code to verify this device.
                </p>
              </div>
              <div className="feature-pill shrink-0">
                <Phone size={12} />
                OTP verified
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Input
              icon={Phone}
              type="text"
              placeholder="Phone (+91987...)"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={otpSent}
            />

            <AnimatePresence>
              {otpSent ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Input
                    icon={Send}
                    type="text"
                    placeholder="6-digit security code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    maxLength={6}
                    className="text-center text-base tracking-[0.4em]"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
