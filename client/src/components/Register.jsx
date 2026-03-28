import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { User, Mail, Lock, ArrowLeft, CheckCircle, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import api from "../services/api";
import { ensureE2EERegistration } from "../services/e2ee";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Register({ onRegister, onBackToLogin }) {
  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStartRegistration = async () => {
    if (!name || !email || !password) {
      return setError("All fields are required");
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/send-email-otp", { email });
      setStep(2);
      setError("Success: OTP Sent! Check your email inbox.");
    } catch (err) {
      console.error("OTP Error:", err);
      setError(err.response?.data?.message || "Failed to send OTP. Check email format.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!otp) return setError("Please enter the OTP");
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/verify-email-otp", { email, otp });
      const res = await api.post("/auth/complete-registration", {
        name,
        email,
        password,
      });
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      try {
        await ensureE2EERegistration(api, res.data.user);
      } catch (keyError) {
        console.error("Failed to initialize E2EE keys:", keyError);
        window.alert(keyError.message || "Your encryption keys could not be restored on this device");
      }
      onRegister();
    } catch (err) {
      console.error("Registration Finalization Error:", err);
      setError(err.response?.data?.message || "Verification or Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
  };

  const stepMeta = [
    { id: 1, label: "Account" },
    { id: 2, label: "Verify" },
  ];

  return (
    <AuthShell
      eyebrow="Create Account"
      title={step === 1 ? "Start your journey" : "Verify your email"}
      description={
        step === 1
          ? "Create a secure RelayChat identity with email and password, then verify access via email OTP."
          : `We've sent a security code to ${email}. Enter it below to finish onboarding.`
      }
      footer={
        <motion.p className="text-sm text-muted-foreground">
          Already a member?{" "}
          <span onClick={onBackToLogin} className="cursor-pointer font-bold text-secondary transition-colors hover:text-foreground">
            Login here
          </span>
        </motion.p>
      }
    >
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full space-y-6">
        <div className="grid gap-2 sm:grid-cols-2">
          {stepMeta.map((item) => {
            const active = step >= item.id;
            return (
              <div
                key={item.id}
                className={`rounded-[22px] border px-4 py-3 ${
                  active ? "border-primary/20 bg-primary/12 text-primary" : "border-white/10 bg-white/6 text-muted-foreground"
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.24em]">Step {item.id}</p>
                <p className="mt-2 text-sm font-semibold">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="surface-inline rounded-[24px] p-4">
          <div className="section-badge">
            <ShieldCheck size={12} />
            Guided onboarding
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Create your identity first, then confirm your phone number before RelayChat provisions your secure workspace.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-sm font-medium backdrop-blur-xl ${
                error.startsWith("Success")
                  ? "border-secondary/20 bg-secondary/12 text-secondary"
                  : "border-destructive/20 bg-destructive/12 text-destructive"
              }`}
            >
              {error.startsWith("Success") ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {error.replace("Success: ", "")}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Input icon={User} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input icon={Mail} placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input
                icon={Lock}
                type="password"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button onClick={handleStartRegistration} disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : "Verify and continue"}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Input
                icon={CheckCircle}
                type="text"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-[0.35em]"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={handleCompleteRegistration} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin" /> : "Verify identity"}
                </Button>
                <Button variant="outline" onClick={() => setStep(1)} className="w-full">
                  <ArrowLeft size={16} />
                  Change details
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AuthShell>
  );
}
