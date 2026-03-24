import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";


import { CheckCircle, AlertCircle } from "lucide-react";
import api from "../services/api";
import { connectSocket } from "../services/socket";
import { ensureE2EERegistration } from "../services/e2ee";
import { isTokenValid } from "../utils/auth";
import socket from "../services/socket";
import { getCurrentDeviceId, getCurrentDeviceLabel } from "../services/e2ee";
import AuthShell from "@/components/auth/AuthShell";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import RestoreSessionUI from "@/components/auth/RestoreSessionUI";

export default function Login({ onLogin, onSignup, canResume = false, sessionExpired = false, onAction }) {
  const [loginMethod, setLoginMethod] = useState("phone"); // Default to Phone OTP
  
  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Phone OTP state
  const [phone, setPhone] = useState("+91");
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
    const digits = phone.replace(/^\+91/, "").replace(/\D/g, "");
    if (digits.length !== 10) return setError("Please enter exactly 10 digits after +91");
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

  const authNotice = error ? (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`mb-6 flex w-full items-center gap-3 rounded-xl border p-3 text-sm font-medium ${
        error.startsWith("Success")
          ? "border-secondary/20 bg-secondary/10 text-secondary"
          : "border-destructive/20 bg-destructive/10 text-destructive"
      }`}
    >
      {error.startsWith("Success") ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      {error.replace("Success: ", "")}
    </motion.div>
  ) : null;

  if (showRestorePrompt) {
    return (
      <AuthShell
        wide
        eyebrow="Recovery Mode"
        title="Restore Your Account"
        description="You're logging in from a new device. Choose how you want to restore your encrypted messages."
      >
        {authNotice}
        <RestoreSessionUI
          restoreError={restoreError}
          isWaitingForApproval={isWaitingForApproval}
          syncStatus={syncStatus}
          restorePin={restorePin}
          setRestorePin={setRestorePin}
          loading={loading}
          onRestoreBackup={handleRestoreBackup}
          onDeviceVerification={handleDeviceVerification}
          onSkipRestore={handleSkipRestore}
          onContinueWithoutHistory={() => {
            setShowRestorePrompt(false);
            onLogin();
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={isRegistering ? "Phone Verified" : loginMethod === "phone" ? "OTP Access" : "Password Access"}
      title={
        isRegistering
          ? "Complete your profile"
          : loginMethod === "phone"
            ? "Continue with your phone"
            : "Welcome back"
      }
      description={
        isRegistering
          ? "Your number is confirmed. Add a few optional identity details before entering RelayChat."
          : loginMethod === "phone"
            ? "Use a security code to unlock RelayChat quickly on any device."
            : "Use your email and password, then continue through secure device verification."
      }
      footer={
        !isRegistering ? (
          <motion.p variants={itemVariants} className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <span onClick={onSignup} className="cursor-pointer font-bold text-secondary hover:underline">
              Sign up for free
            </span>
          </motion.p>
        ) : null
      }
    >
      {authNotice}

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full">
        <AnimatePresence mode="wait">
          {loginMethod === "phone" ? (
            <PhoneOtpForm
              key="phone-flow"
              phone={phone}
              setPhone={setPhone}
              otp={otp}
              setOtp={setOtp}
              otpSent={otpSent}
              canResume={canResume}
              canResendAt={canResendAt}
              loading={loading}
              onPrimaryAction={!otpSent ? handleSendOtp : handleVerifyOtp}
              onResumeSession={handleResumeSession}
              onResend={handleResendOtp}
              onSwitchMethod={() => {
                setLoginMethod("email");
                setError("");
              }}
              isRegistering={isRegistering}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              onCompleteRegistration={handleCompleteRegistration}
              onCancelRegistration={() => {
                setIsRegistering(false);
                setOtpSent(false);
                setOtp("");
                setError("");
              }}
            />
          ) : (
            <EmailLoginForm
              key="email-flow"
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              loading={loading}
              onSubmit={handleEmailLogin}
              onBack={() => {
                setLoginMethod("phone");
                setError("");
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AuthShell>
  );
}
