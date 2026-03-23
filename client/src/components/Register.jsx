import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ensure `motion` is treated as used by the linter (used in JSX via <motion.* />)
void motion;
import { User, Mail, Lock, Phone, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "../services/api";
import { ensureE2EERegistration } from "../services/e2ee";

// Stitch Ethereal UI
import { Button } from "./stitch/Button";
import { Input } from "./stitch/Input";
import { Card } from "./stitch/Card";

export default function Register({ onRegister, onBackToLogin }) {
  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStartRegistration = async () => {
    if (!name || !email || !password || !phone) {
      return setError("All fields are required");
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/send-otp", { phone });
      setStep(2);
      setError("Success: OTP Sent! Check your mobile device.");
    } catch (err) {
      console.error("OTP Error:", err);
      setError(err.response?.data?.message || "Failed to send OTP. Check phone format.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!otp) return setError("Please enter the OTP");
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/verify-otp", { phone, otp });
      const res = await api.post("/auth/complete-registration", {
        name,
        email,
        password,
        phoneNumber: phone
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0b0e14] relative overflow-hidden">
      {/* Ambient glowing orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-[#c59aff]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-[#00eefc]/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <Card className="flex flex-col items-center shadow-[0_20px_60px_-15px_rgba(197,154,255,0.05)]">
          <div className="mb-8 text-center pt-2">
            <h2 className="text-3xl font-bold text-[#ecedf6] mb-2 font-space tracking-tight">
              {step === 1 ? "Start Your Journey" : "Almost Done"}
            </h2>
            <p className="text-[#a9abb3] text-sm font-medium px-4 font-inter">
              {step === 1 
                ? "Join the next generation of secure messaging. It only takes a minute." 
                : `We've sent a special code to ${phone}. Enter it below.`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl mb-6 text-sm font-medium font-inter ${
                  error.startsWith("Success") 
                    ? "bg-[#006970]/40 text-[#00eefc] border border-[#00eefc]/20" 
                    : "bg-[#a70138]/40 text-[#ffb2b9] border border-[#ff6e84]/20"
                }`}
              >
                {error.startsWith("Success") ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {error.replace("Success: ", "")}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full space-y-4">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <Input
                    icon={User}
                    placeholder="Full Name" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                  />
                  <Input
                    icon={Mail}
                    placeholder="Email Address" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                  />
                  <Input
                    icon={Lock}
                    type="password"
                    placeholder="Create Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <Input
                    icon={Phone}
                    placeholder="Phone Number (+91...)" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                  />

                  <div className="pt-4">
                    <Button 
                      onClick={handleStartRegistration} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? <Loader2 className="animate-spin text-[#420082]" /> : "Verify & Continue"}
                    </Button>
                  </div>
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
                    onChange={e => setOtp(e.target.value)}
                    maxLength={6}
                    className="text-center tracking-widest text-lg"
                  />
                  <div className="pt-4">
                    <Button 
                      onClick={handleCompleteRegistration} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? <Loader2 className="animate-spin text-[#420082]" /> : "Verify Identity"}
                    </Button>
                  </div>
                  <button 
                    className="w-full flex items-center justify-center gap-2 text-[#a9abb3] text-sm font-medium hover:text-[#ecedf6] transition-colors mt-4 font-inter"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft size={16} />
                    Change Details
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.p className="mt-8 mb-2 text-[#a9abb3] text-sm font-inter">
            Already a member?{" "}
            <span 
              onClick={onBackToLogin}
              className="text-[#00eefc] font-bold cursor-pointer hover:underline"
            >
              Login here
            </span>
          </motion.p>
        </Card>
      </motion.div>
    </div>
  );
}
