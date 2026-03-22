import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ensure `motion` is treated as used by the linter (used in JSX via <motion.* />)
void motion;

import { Phone, Mail, Lock, User, ArrowLeft, Send, CheckCircle, AlertCircle, Loader2, Smartphone } from "lucide-react";
import api from "../services/api";
import { connectSocket } from "../services/socket";
import { ensureE2EERegistration } from "../services/e2ee";

export default function Login({ onLogin, onSignup }) {
  const [loginMethod, setLoginMethod] = useState("phone"); // Default to Phone OTP
  
  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [canResendAt, setCanResendAt] = useState(0);
  
  // Registration Flow state (for new phone users)
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Restore Backup state
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restoreAuthData, setRestoreAuthData] = useState(null);
  const [restorePin, setRestorePin] = useState("");
  const [restoreError, setRestoreError] = useState("");

  const handleLoginSuccess = async (res) => {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    
    const userId = res.data.user._id;
    const hasLocalKey = !!localStorage.getItem(`relaychat-e2ee-private-key-${userId}`);

    if (!hasLocalKey) {
      try {
        const backupRes = await api.get("/user/backup");
        if (backupRes.status === 200 && backupRes.data?.encryptedKey) {
          setRestoreAuthData(res.data);
          setShowRestorePrompt(true);
          return;
        }
      } catch (err) {
        // No backup found or error, continue to normal flow (creates new key)
      }
    }

    try {
      await ensureE2EERegistration(api, res.data.user);
      connectSocket();
      onLogin();
    } catch (keyError) {
      console.error("Failed to initialize E2EE keys:", keyError);
      window.alert(keyError.message || "Your encryption keys could not be restored on this device");
      connectSocket();
      onLogin();
    }
  };

  const handleRestoreBackup = async () => {
    if (!restorePin) return setRestoreError("Please enter your Backup PIN");
    setLoading(true);
    setRestoreError("");
    try {
      const { restorePrivateKeyFromCloud } = await import("../services/e2ee");
      await restorePrivateKeyFromCloud(api, restoreAuthData.user._id, restorePin);
      
      await ensureE2EERegistration(api, restoreAuthData.user);
      
      const deviceId = localStorage.getItem("relaychat-e2ee-device-id");
      if (deviceId) {
        localStorage.removeItem(`relaychat-history-sync-needed-${restoreAuthData.user._id}-${deviceId}`);
      }
      
      setShowRestorePrompt(false);
      connectSocket();
      onLogin();
    } catch (err) {
      console.error(err);
      setRestoreError(err.message || "Failed to restore backup or incorrect PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipRestore = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleDeviceVerification = async () => {
    setLoading(true);
    setRestoreError("");
    try {
      await ensureE2EERegistration(api, restoreAuthData.user);
      setShowRestorePrompt(false);
      connectSocket();
      onLogin();
    } catch (keyError) {
      console.error("Failed to initialize E2EE keys:", keyError);
      window.alert(keyError.message || "Your encryption keys could not be generated");
      setShowRestorePrompt(false);
      connectSocket();
      onLogin();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return setError("Please enter email and password");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      await handleLoginSuccess(res);
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
      setCanResendAt(Date.now() + 45 * 1000);
    } catch (err) {
      console.error("OTP send error:", err);
      setError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading) return;
    if (Date.now() < canResendAt) return;
    await handleSendOtp();
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
        await handleLoginSuccess(res);
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
      await handleLoginSuccess(res);
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
      
      {showRestorePrompt ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl flex flex-col items-center space-y-8"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">Restore Your Account</h2>
            <p className="text-slate-400 text-sm">
              You're logging in from a new device. Choose how you want to restore your encrypted messages.
            </p>
          </div>

          {restoreError && (
            <div className="w-full max-w-md bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm font-medium text-center">
              {restoreError}
            </div>
          )}

          <div className="w-full flex flex-col md:flex-row gap-6">
            {/* Option 1: Cloud Backup */}
            <div className="flex-1 glass-card p-6 flex flex-col items-center text-center space-y-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-whatsapp-green/5 rounded-full blur-2xl group-hover:bg-whatsapp-green/10 transition-colors" />
              <div className="w-14 h-14 bg-whatsapp-green/10 rounded-full flex items-center justify-center text-whatsapp-green">
                <Lock size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Cloud Backup</h3>
                <p className="text-slate-400 text-xs">
                  Restore instantly using the 4-digit PIN you created on your previous device.
                </p>
              </div>
              <div className="w-full space-y-3 mt-auto pt-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
                  <input
                    type="password"
                    placeholder="Enter Backup PIN"
                    value={restorePin}
                    onChange={e => setRestorePin(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/5 rounded-xl focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none text-sm transition-all text-center tracking-widest"
                  />
                </div>
                <button 
                  onClick={handleRestoreBackup} 
                  disabled={loading || restorePin.length < 4}
                  className="interactive-btn w-full bg-whatsapp-green text-whatsapp-bg-dark font-bold py-2.5 rounded-xl hover:bg-emerald-400 disabled:opacity-50 text-sm"
                >
                  {loading && restorePin ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Restore with PIN"}
                </button>
              </div>
            </div>

            {/* Option 2: Device Approval */}
            <div className="flex-1 glass-card p-6 flex flex-col items-center text-center space-y-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-colors" />
              <div className="w-14 h-14 bg-sky-500/10 rounded-full flex items-center justify-center text-sky-400">
                <Smartphone size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Device Approval</h3>
                <p className="text-slate-400 text-xs">
                  Forgot your PIN? Log in anyway and request sync approval from another trusted device.
                </p>
              </div>
              <div className="w-full mt-auto pt-2">
                <button 
                  onClick={handleDeviceVerification}
                  disabled={loading && !restorePin}
                  className="interactive-btn w-full bg-sky-500 text-white font-bold py-2.5 rounded-xl hover:bg-sky-400 disabled:opacity-50 text-sm"
                >
                  {loading && !restorePin ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Ask Trusted Device"}
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSkipRestore}
            className="text-slate-500 text-sm hover:text-white transition-colors"
          >
            Cancel and log back out
          </button>
        </motion.div>
      ) : (
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

              {otpSent && (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || Date.now() < canResendAt}
                  className="w-full py-2 bg-white/5 text-slate-200 font-semibold rounded-lg text-sm interactive-btn flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Date.now() < canResendAt
                    ? `Resend in ${Math.ceil((canResendAt - Date.now()) / 1000)}s`
                    : "Resend OTP"}
                </button>
              )}

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
      )}
    </div>
  );
}
