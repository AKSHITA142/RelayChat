import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, Lock, User, ArrowLeft, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "../services/api";
import { connectSocket } from "../services/socket";

export default function Login({ onLogin, onSignup }) {
  const [loginMethod, setLoginMethod] = useState("phone"); // Default to Phone OTP
  
  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
  // Registration Flow state (for new phone users)
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoginSuccess = (res) => {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    connectSocket();
    onLogin();
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return setError("Please enter email and password");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      handleLoginSuccess(res);
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone) return setError("Please enter a phone number");
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/send-otp", { phone });
      setOtpSent(true);
      setError("Success: OTP Sent Successfully!");
    } catch (err) {
      console.error("OTP send error:", err);
      setError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phone || !otp) return setError("Please enter phone and OTP");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/verify-otp", { phone, otp });
      
      if (res.status === 202) {
        setIsRegistering(true);
        setError("Success: Phone verified! Complete your profile.");
      } else {
        handleLoginSuccess(res);
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      setError(err.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!name) return setError("Name is required");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/complete-registration", {
        name,
        email,
        password,
        phoneNumber: phone
      });
      handleLoginSuccess(res);
    } catch (err) {
      console.error("Registration failed:", err);
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-whatsapp-bg-dark to-slate-900">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="glass-card w-full max-w-md p-8 flex flex-col items-center"
      >
        <motion.div variants={itemVariants} className="mb-8 text-center">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-whatsapp-green to-emerald-400 bg-clip-text text-transparent">
            RelayChat
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            {isRegistering ? "Unlocking your new workspace" : loginMethod === "phone" ? "Enter your phone to continue" : "Welcome back, let's get you in"}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg mb-6 text-sm font-medium ${
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
            {isRegistering ? (
              <motion.div 
                key="register" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input
                    type="password"
                    placeholder="Password (Optional)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleCompleteRegistration} 
                  disabled={loading}
                  className="interactive-btn w-full bg-whatsapp-green text-whatsapp-bg-dark font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Complete Setup"}
                </button>
                <button 
                  onClick={() => { setIsRegistering(false); setOtpSent(false); setOtp(""); setError(""); }}
                  className="w-full text-slate-500 text-sm font-medium hover:text-white transition-colors"
                >
                  Cancel and start over
                </button>
              </motion.div>
            ) : loginMethod === "phone" ? (
              <motion.div 
                key="phone" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input
                    type="text"
                    placeholder="Phone (+91987...)"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={otpSent}
                    className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all disabled:opacity-50"
                  />
                </div>
                
                {otpSent && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="relative"
                  >
                    <Send className="absolute left-3 top-3 text-slate-500" size={20} />
                    <input
                      type="text"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      maxLength={6}
                      className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all"
                    />
                  </motion.div>
                )}

                <button 
                  onClick={!otpSent ? handleSendOtp : handleVerifyOtp} 
                  disabled={loading}
                  className="interactive-btn w-full bg-whatsapp-green text-whatsapp-bg-dark font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : !otpSent ? "Send Security Code" : "Verify & Log In"}
                </button>

                <div 
                  className="text-center mt-6 cursor-pointer text-slate-400 hover:text-whatsapp-green text-sm transition-colors"
                  onClick={() => { setLoginMethod("email"); setError(""); }}
                >
                  Prefer password login?
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="email" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input
                    type="email"
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
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-whatsapp-bg-dark border border-white/10 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleEmailLogin} 
                  disabled={loading}
                  className="interactive-btn w-full bg-whatsapp-green text-whatsapp-bg-dark font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Login to Workspace"}
                </button>
                <div 
                  className="flex items-center justify-center gap-2 mt-6 cursor-pointer text-slate-400 hover:text-whatsapp-green text-sm transition-colors"
                  onClick={() => { setLoginMethod("phone"); setError(""); }}
                >
                  <ArrowLeft size={16} />
                  Back to Security Code
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isRegistering && (
          <motion.p variants={itemVariants} className="mt-8 text-slate-500 text-sm">
            Don't have an account?{" "}
            <span 
              onClick={onSignup}
              className="text-whatsapp-green font-bold cursor-pointer hover:underline"
            >
              Sign up for free
            </span>
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}


