import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ensure `motion` is treated as used by the linter (used in JSX via <motion.* />)
void motion;

import { Phone, Mail, Lock, User, ArrowLeft, Send, CheckCircle, AlertCircle, Loader2, Smartphone } from "lucide-react";
import api from "../services/api";
import { connectSocket } from "../services/socket";
import { ensureE2EERegistration } from "../services/e2ee";
import { isTokenValid } from "../utils/auth";
import socket from "../services/socket";
import { getCurrentDeviceId, getCurrentDeviceLabel } from "../services/e2ee";

// Stitch Ethereal UI
import { Button } from "./stitch/Button";
import { Input } from "./stitch/Input";
import { Card } from "./stitch/Card";

export default function Login({ onLogin, onSignup, canResume = false, sessionExpired = false, onAction }) {
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
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Initializing device...");

  // Surface an immediate prompt when the stored token is missing/invalid
  useEffect(() => {
    if (sessionExpired) {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      setIsWaitingForApproval(false);
      setOtpSent(false);
      setIsRegistering(false);
      if (storedUser) {
        // Skip phone entry — jump directly to PIN/Device verification
        setRestoreAuthData({ user: storedUser });
        setShowRestorePrompt(true);
        setError("Session expired. Please verify your identity to continue.");
      } else {
        setShowRestorePrompt(false);
        setError("Your session expired. Please verify again to continue.");
      }
    }
  }, [sessionExpired]);

  const handleLoginSuccess = async (res) => {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    localStorage.setItem("session-active", "true");

    // Always show PIN/Device verification as the mandatory second step
    setRestoreAuthData(res.data);
    setShowRestorePrompt(true);
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
      const { ensureIdentityKeyPair } = await import("../services/e2ee");
      const userId = restoreAuthData.user._id;
      const deviceId = getCurrentDeviceId();

      // Generate a fresh key pair for this device (no existing key needed)
      const { publicKey } = await ensureIdentityKeyPair(userId);

      // Register the new device key on the server
      await api.post("/user/encryption-key", {
        publicKey,
        deviceId,
        deviceLabel: getCurrentDeviceLabel(),
      });

      const otherDevices = (restoreAuthData.user.encryptionDevices || [])
        .filter(d => d.deviceId !== deviceId);

      setIsWaitingForApproval(true);
      connectSocket();

      if (otherDevices.length > 0) {
        socket.emit("request-history-sync", {
          requesterDeviceId: deviceId,
          requesterLabel: getCurrentDeviceLabel(),
        }, (result) => {
          if (result?.ok) {
            setSyncStatus("Approval request sent! Please check your other trusted device.");
          } else {
            setSyncStatus("No other devices online. You can log in without history sync.");
            setTimeout(() => { setShowRestorePrompt(false); onLogin(); }, 5000);
          }
        });

        socket.on("history-sync-complete", (data) => {
          if (data.requesterDeviceId === deviceId) {
            setSyncStatus("Approved! Syncing your encrypted keys...");
            setTimeout(() => { setShowRestorePrompt(false); onLogin(); window.location.reload(); }, 2500);
          }
        });
      } else {
        // No other devices — just let them in
        setSyncStatus("No trusted devices found. Logging in without history sync.");
        setTimeout(() => { setShowRestorePrompt(false); connectSocket(); onLogin(); }, 3000);
      }
    } catch (keyError) {
      console.error("Device verification error:", keyError);
      setRestoreError(keyError.message || "Could not register this device. Please try again.");
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
    onAction?.();
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

  const handleResumeSession = async () => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const nowValid = token && isTokenValid(token);
    if (!nowValid || !storedUser) {
      setError("Saved session expired. Please verify again.");
      localStorage.removeItem("session-active");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await ensureE2EERegistration(api, storedUser);
      connectSocket();
      localStorage.setItem("session-active", "true");
      onLogin();
    } catch (err) {
      console.error("Resume session error:", err);
      setError(err.message || "Could not resume session, please log in again.");
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0b0e14] relative overflow-hidden">
      {/* Ambient glowing orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-[#c59aff]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-[#00eefc]/20 blur-[120px] rounded-full pointer-events-none" />

      
      {showRestorePrompt ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl flex flex-col items-center space-y-8"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-[#ecedf6] font-space">Restore Your Account</h2>
            <p className="text-[#a9abb3] text-sm font-inter">
              You're logging in from a new device. Choose how you want to restore your encrypted messages.
            </p>
          </div>

          {restoreError && (
            <div className="w-full max-w-md bg-[#45484f]/10 border border-[#45484f]/20 text-[#ff6e84] p-3 rounded-lg text-sm font-medium text-center">
              {restoreError}
            </div>
          )}

          <div className="w-full flex flex-col md:flex-row gap-6">
            <AnimatePresence mode="wait">
              {isWaitingForApproval ? (
                <motion.div 
                  key="waiting"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full"
                >
                  <Card className="w-full flex flex-col items-center text-center space-y-6 py-10 relative overflow-hidden bg-gradient-to-b from-[#0b0e14] to-[#14181f]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00eefc] to-transparent animate-pulse" />
                    <div className="w-20 h-20 bg-[#00eefc]/5 rounded-full flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border-2 border-[#00eefc]/20 border-t-[#00eefc] animate-spin" />
                      <Smartphone size={36} className="text-[#00eefc]" />
                    </div>
                
                    <div className="space-y-3 max-w-sm">
                      <h3 className="text-xl font-bold text-[#ecedf6] font-space tracking-wide">Waiting for Approval</h3>
                      <p className="text-[#a9abb3] text-sm leading-relaxed px-4">
                        {syncStatus}
                      </p>
                    </div>

                    <div className="w-full max-w-xs pt-4">
                      <Button 
                        variant="secondary"
                        onClick={() => { setShowRestorePrompt(false); onLogin(); }}
                        className="w-full text-xs font-semibold"
                      >
                        Log in anyway (No history sync)
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <>
                  {/* Option 1: Cloud Backup */}
                  <Card className="flex-1 flex flex-col items-center text-center space-y-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#c59aff]/5 rounded-full blur-2xl group-hover:bg-[#c59aff]/10 transition-colors" />
                    <div className="w-14 h-14 bg-[#c59aff]/10 rounded-full flex items-center justify-center text-[#c59aff]">
                      <Lock size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#ecedf6] mb-2 font-space">Cloud Backup</h3>
                      <p className="text-[#a9abb3] text-xs">
                        Restore instantly using the 4-digit PIN you created on your previous device.
                      </p>
                    </div>
                    <div className="w-full space-y-3 mt-auto pt-2">
                      <Input
                        icon={Lock}
                        type="password"
                        placeholder="Enter Backup PIN"
                        value={restorePin}
                        onChange={e => setRestorePin(e.target.value)}
                        className="text-center tracking-widest"
                      />
                      <Button 
                        onClick={handleRestoreBackup} 
                        disabled={loading || restorePin.length < 4}
                        className="w-full font-bold py-2.5"
                      >
                        {loading && restorePin ? <Loader2 className="animate-spin" size={18} /> : "Restore with PIN"}
                      </Button>
                    </div>
                  </Card>

                  {/* Option 2: Device Approval */}
                  <Card className="flex-1 flex flex-col items-center text-center space-y-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00eefc]/5 rounded-full blur-2xl group-hover:bg-[#00eefc]/10 transition-colors" />
                    <div className="w-14 h-14 bg-[#00eefc]/10 rounded-full flex items-center justify-center text-[#00eefc]">
                      <Smartphone size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#ecedf6] mb-2 font-space">Device Approval</h3>
                      <p className="text-[#a9abb3] text-xs">
                        Forgot your PIN? Log in anyway and request sync approval from another trusted device.
                      </p>
                    </div>
                    <div className="w-full mt-auto pt-2">
                      <Button 
                        onClick={handleDeviceVerification}
                        disabled={loading && !restorePin}
                        variant="secondary"
                        className="w-full font-bold py-2.5"
                      >
                        {loading && !restorePin ? <Loader2 className="animate-spin" size={18} /> : "Ask Trusted Device"}
                      </Button>
                    </div>
                  </Card>
                </>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={handleSkipRestore}
            className="text-[#a9abb3] text-sm hover:text-[#ecedf6] transition-colors font-inter"
          >
            Cancel and log back out
          </button>
        </motion.div>
      ) : (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <Card className="flex flex-col items-center shadow-[0_20px_60px_-15px_rgba(197,154,255,0.05)]">
          <motion.div variants={itemVariants} className="mb-8 text-center pt-2">
            <h2 className="text-4xl font-bold font-space tracking-tight bg-gradient-to-br from-[#c59aff] to-[#00eefc] bg-clip-text text-transparent pb-1">
              RelayChat
            </h2>
            <p className="text-[#a9abb3] mt-2 text-sm font-medium font-inter">
              {isRegistering ? "Unlocking your new workspace" : loginMethod === "phone" ? "Enter your phone to continue" : "Welcome back, let's get you in"}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg mb-6 text-sm font-medium font-inter ${
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
              {isRegistering ? (
                <motion.div 
                  key="register" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <Input
                    icon={User}
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                  <Input
                    icon={Mail}
                    type="email"
                    placeholder="Email (Optional)"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <Input
                    icon={Lock}
                    type="password"
                    placeholder="Password (Optional)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <Button 
                    onClick={handleCompleteRegistration} 
                    disabled={loading}
                    className="w-full mt-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "Complete Setup"}
                  </Button>
                  <button 
                    onClick={() => { setIsRegistering(false); setOtpSent(false); setOtp(""); setError(""); }}
                    className="w-full text-[#a9abb3] text-sm font-medium hover:text-[#ecedf6] transition-colors mt-2"
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
                  <Input
                    icon={Phone}
                    type="text"
                    placeholder="Phone (+91987...)"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={otpSent}
                  />
                  
                  {otpSent && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="origin-top"
                    >
                      <Input
                        icon={Send}
                        type="text"
                        placeholder="6-digit OTP"
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        maxLength={6}
                        className="mt-4"
                      />
                    </motion.div>
                  )}

                  <div className="pt-2">
                    <Button 
                      onClick={!otpSent ? handleSendOtp : handleVerifyOtp} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : !otpSent ? "Send Security Code" : "Verify & Log In"}
                    </Button>
                  </div>

                  {canResume && !otpSent && (
                    <Button
                      variant="secondary"
                      onClick={handleResumeSession}
                      disabled={loading}
                      className="w-full mt-2"
                    >
                      Continue with saved session
                    </Button>
                  )}

                  {otpSent && (
                    <Button
                      variant="secondary"
                      onClick={handleResendOtp}
                      disabled={loading || Date.now() < canResendAt}
                      className="w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {Date.now() < canResendAt
                        ? `Resend in ${Math.ceil((canResendAt - Date.now()) / 1000)}s`
                        : "Resend OTP"}
                    </Button>
                  )}

                  <div 
                    className="text-center mt-6 cursor-pointer text-[#a9abb3] hover:text-[#c59aff] text-sm transition-colors py-2"
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
                  <Input
                    icon={Mail}
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <Input
                    icon={Lock}
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <div className="pt-2">
                    <Button 
                      onClick={handleEmailLogin} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : "Login to Workspace"}
                    </Button>
                  </div>
                  <div 
                    className="flex items-center justify-center gap-2 mt-6 cursor-pointer text-[#a9abb3] hover:text-[#c59aff] text-sm transition-colors py-2"
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
            <motion.p variants={itemVariants} className="mt-8 mb-2 text-[#a9abb3] text-sm font-inter">
              Don't have an account?{" "}
              <span 
                onClick={onSignup}
                className="text-[#00eefc] font-bold cursor-pointer hover:underline"
              >
                Sign up for free
              </span>
            </motion.p>
          )}
        </Card>
      </motion.div>
      )}
    </div>
  );
}
