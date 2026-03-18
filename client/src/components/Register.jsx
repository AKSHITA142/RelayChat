import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ensure `motion` is treated as used by the linter (used in JSX via <motion.* />)
void motion;
import { User, Mail, Lock, Phone, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "../services/api";

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-whatsapp-bg-dark to-slate-900">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="glass-card w-full max-w-md p-8 flex flex-col items-center"
      >
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            {step === 1 ? "Start Your Journey" : "Almost Done"}
          </h2>
          <p className="text-slate-400 text-sm font-medium px-4">
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
              className={`w-full flex items-center gap-3 p-3 rounded-xl mb-6 text-sm font-medium ${
                error.startsWith("Success") 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
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
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input 
                    placeholder="Full Name" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input 
                    placeholder="Email Address" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input
                    type="password"
                    placeholder="Create Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input 
                    placeholder="Phone Number (+91...)" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all"
                  />
                </div>

                <button 
                  onClick={handleStartRegistration} 
                  disabled={loading}
                  className="interactive-btn w-full bg-whatsapp-green text-whatsapp-bg-dark font-bold py-3 mt-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin text-whatsapp-bg-dark" /> : "Verify & Continue"}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <CheckCircle className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input
                    type="text"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    maxLength={6}
                    className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleCompleteRegistration} 
                  disabled={loading}
                  className="interactive-btn w-full bg-whatsapp-green text-whatsapp-bg-dark font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin text-whatsapp-bg-dark" /> : "Verify Identity"}
                </button>
                <button 
                  className="w-full flex items-center justify-center gap-2 text-slate-500 text-sm font-medium hover:text-white transition-colors"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} />
                  Change Details
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.p className="mt-8 text-slate-500 text-sm">
          Already a member?{" "}
          <span 
            onClick={onBackToLogin}
            className="text-whatsapp-green font-bold cursor-pointer hover:underline"
          >
            Login here
          </span>
        </motion.p>
      </motion.div>
    </div>
  );
}


