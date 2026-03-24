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
          className="space-y-4"
        >
          <div className="mb-2 flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-secondary">
            <CheckCircle size={12} />
            Profile completion
          </div>

          <Input icon={User} type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input icon={Mail} type="email" placeholder="Email (Optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            icon={Lock}
            type="password"
            placeholder="Password (Optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={onCompleteRegistration} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : "Complete Setup"}
            </Button>
            <Button variant="outline" onClick={onCancelRegistration} className="w-full">
              Start Over
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="phone-otp"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          className="space-y-4"
        >
          <Input
            icon={Phone}
            type="text"
            placeholder="Phone (+91987...)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <Button onClick={onPrimaryAction} disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" /> : otpSent ? "Verify & Log In" : "Send Security Code"}
          </Button>

          {canResume && !otpSent ? (
            <Button variant="secondary" onClick={onResumeSession} disabled={loading} className="w-full">
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
                : "Resend OTP"}
            </Button>
          ) : null}

          <button
            type="button"
            onClick={onSwitchMethod}
            className="w-full pt-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Prefer password login?
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
