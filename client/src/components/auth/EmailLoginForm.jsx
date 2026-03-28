import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EmailLoginForm({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  onSubmit,
  onBack,
}) {
  return (
    <motion.div
      key="email-login"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="surface-inline rounded-[24px] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-secondary">Credential sign-in</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use your saved credentials here, then continue through the same trusted-device verification flow.
        </p>
      </div>

      <div className="grid gap-4">
        <Input icon={Mail} type="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Input
          icon={Lock}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <Button onClick={onSubmit} disabled={loading} className="w-full">
        {loading ? <Loader2 className="animate-spin" /> : "Login to workspace"}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back to OTP verification
      </button>
    </motion.div>
  );
}
