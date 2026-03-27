import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Mail, Phone, ShieldCheck } from "lucide-react";
import api from "../services/api";
import { connectSocket } from "../services/socket";
import {
  ensureE2EERegistration,
  getCurrentDeviceId,
  getCurrentDeviceLabel,
  markHistorySyncComplete,
  needsHistorySync,
} from "../services/e2ee";
import { isTokenValid } from "../utils/auth";
import socket from "../services/socket";
import AuthShell from "@/components/auth/AuthShell";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import RestoreSessionUI from "@/components/auth/RestoreSessionUI";
import { cn } from "@/lib/utils";

export default function Login({ onLogin, onSignup, canResume = false, sessionExpired = false, onAction }) {
  const [loginMethod, setLoginMethod] = useState("phone");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [canResendAt, setCanResendAt] = useState(0);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restoreAuthData, setRestoreAuthData] = useState(null);
  const [restorePin, setRestorePin] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Initializing device...");

  useEffect(() => {
    if (sessionExpired) {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      setIsWaitingForApproval(false);
      setOtpSent(false);
      setIsRegistering(false);
      if (storedUser) {
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

    try {
      const updatedUser = await ensureE2EERegistration(api, res.data.user);
      const effectiveUser = updatedUser || res.data.user;

      // New device registration + other trusted devices present => require verification now.
      if (needsHistorySync(effectiveUser._id)) {
        setRestoreAuthData({ ...res.data, user: effectiveUser });
        setShowRestorePrompt(true);
        setRestoreError("");
        setIsWaitingForApproval(false);
        setSyncStatus("");
        return;
      }

      localStorage.setItem("session-active", "true");
      connectSocket();
      setShowRestorePrompt(false);
      onLogin();
    } catch (err) {
      console.warn("E2EE restore required:", err);
      setRestoreAuthData(res.data);
      setShowRestorePrompt(true);
      setRestoreError(err?.message || "");
    }
  };

  const handleRestoreBackup = async () => {
    if (!restorePin) return setRestoreError("Please enter your Backup PIN");
    setLoading(true);
    setRestoreError("");
    try {
      const { restorePrivateKeyFromCloud } = await import("../services/e2ee");
      const restoreUserId = restoreAuthData.user._id;
      const restored = await restorePrivateKeyFromCloud(api, restoreUserId, restorePin);
      let latestUser = restoreAuthData.user;

      // Ensure the server's record for THIS deviceId matches the restored key.
      // This avoids "missing original encryption key" when a device was previously registered
      // with a different key and then local storage was cleared.
      if (restored?.publicKey) {
        const encryptionKeyRes = await api.post("/user/encryption-key", {
          publicKey: restored.publicKey,
          deviceId: getCurrentDeviceId(),
          deviceLabel: getCurrentDeviceLabel(),
        });

        if (encryptionKeyRes?.data?.user) {
          latestUser = { ...latestUser, ...encryptionKeyRes.data.user };
          localStorage.setItem("user", JSON.stringify(latestUser));
          setRestoreAuthData((prev) => (prev ? { ...prev, user: latestUser } : prev));
        }
      }
      
      const ensuredUser = await ensureE2EERegistration(api, latestUser);
      if (ensuredUser) {
        localStorage.setItem("user", JSON.stringify(ensuredUser));
      }
      
      try {
        markHistorySyncComplete(restoreUserId);
      } catch {
        /* ignore */
      }
      
      setShowRestorePrompt(false);
      localStorage.setItem("session-active", "true");
      connectSocket();
      onLogin();
    } catch (err) {
      console.error(err);
      setRestoreError(err.response?.data?.message || err.message || "Failed to restore backup or incorrect PIN");
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

      const { publicKey } = await ensureIdentityKeyPair(userId);

      await api.post("/user/encryption-key", {
        publicKey,
        deviceId,
        deviceLabel: getCurrentDeviceLabel(),
      });

      const otherDevices = (restoreAuthData.user.encryptionDevices || [])
        .filter(d => d.deviceId !== deviceId);

      setIsWaitingForApproval(true);
      
      if (otherDevices.length > 0) {
        const sendHistorySyncRequest = () => {
          if (!socket.connected) {
            setTimeout(sendHistorySyncRequest, 100);
            return;
          }

          let completed = false;
          let completionTimer = null;

          const cleanup = () => {
            socket.off("history-sync-response", handleHistorySyncResponse);
            socket.off("history-sync-complete", handleHistorySyncComplete);
            if (completionTimer) {
              clearTimeout(completionTimer);
              completionTimer = null;
            }
          };

          const finishLogin = () => {
            if (completed) return;
            completed = true;
            cleanup();
            try {
              markHistorySyncComplete(userId);
            } catch {
              /* ignore */
            }
            setShowRestorePrompt(false);
            localStorage.setItem("session-active", "true");
            connectSocket();
            onLogin();
          };

          const handleHistorySyncComplete = (data) => {
            if (data?.requesterDeviceId !== deviceId) return;
            if (data?.syncedCount === 0) {
              setRestoreError("Approved, but no message keys were synced. Keep both devices online and try again, or use your backup PIN.");
              cleanup();
              setIsWaitingForApproval(false);
              return;
            }

            setSyncStatus(`Synced ${data?.syncedCount || 0} keys. Entering chat...`);
            finishLogin();
          };

          const handleHistorySyncResponse = (data) => {
            if (data?.requesterDeviceId !== deviceId) return;

            if (!data?.approved) {
              setSyncStatus("Approval declined on your other device. You can try again or use your PIN.");
              cleanup();
              setIsWaitingForApproval(false);
              return;
            }

            setSyncStatus("Approved! Syncing message keys...");

            // Wait for "history-sync-complete" from the approving device.
            completionTimer = setTimeout(() => {
              setRestoreError("Still syncing... Keep this screen open on both devices, or use your backup PIN.");
            }, 20000);
          };

          socket.off("history-sync-response", handleHistorySyncResponse);
          socket.off("history-sync-complete", handleHistorySyncComplete);
          socket.on("history-sync-response", handleHistorySyncResponse);
          socket.on("history-sync-complete", handleHistorySyncComplete);

          socket.emit("request-history-sync", {
            requesterDeviceId: deviceId,
            requesterLabel: getCurrentDeviceLabel(),
            requesterPublicKey: publicKey,
          }, (result) => {
            if (result?.ok) {
              setSyncStatus("Approval request sent! Please check your other trusted device.");
            } else {
              setRestoreError(result?.message || "No other trusted device is online right now.");
              cleanup();
              setIsWaitingForApproval(false);
            }
          });
        };
        
        connectSocket();
        sendHistorySyncRequest();
      } else {
        connectSocket();
        setRestoreError("No trusted devices found for approval. Use your backup PIN or continue without history.");
        setIsWaitingForApproval(false);
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
    onAction?.();
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
    onAction?.();
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

  const authSteps = showRestorePrompt
    ? ["Authenticate", "Verify device", "Restore access"]
    : isRegistering
      ? ["Verify phone", "Create profile", "Enter workspace"]
      : loginMethod === "phone"
        ? [otpSent ? "Phone entered" : "Enter phone", otpSent ? "Verify code" : "Receive code", "Secure device check"]
        : ["Enter credentials", "Secure device check", "Restore access"];

  const authNotice = error ? (
    <div
      role="alert"
      className={`mb-6 flex w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-sm font-medium backdrop-blur-xl transition-all ${
        error.startsWith("Success")
          ? "border-secondary/20 bg-secondary/12 text-secondary"
          : "border-destructive/20 bg-destructive/12 text-destructive"
      }`}
    >
      {error.startsWith("Success") ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      {error.replace("Success: ", "")}
    </div>
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
          onGoToPIN={() => {
            setIsWaitingForApproval(false);
            setSyncStatus("");
          }}
          onSkipRestore={handleSkipRestore}
          onContinueWithoutHistory={() => {
            setShowRestorePrompt(false);
            localStorage.setItem("session-active", "true");
            connectSocket();
            try {
              const restoreUserId = restoreAuthData?.user?._id;
              if (restoreUserId) {
                markHistorySyncComplete(restoreUserId);
              }
            } catch {
              /* ignore */
            }
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
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <span onClick={onSignup} className="cursor-pointer font-bold text-secondary transition-colors hover:text-foreground">
              Sign up for free
            </span>
          </p>
        ) : null
      }
    >
      <div className="mb-6 flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {authSteps.map((step, index) => (
            <div key={step} className="surface-inline rounded-[20px] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">{step}</p>
            </div>
          ))}
        </div>

        {!isRegistering ? (
          <div className="inline-flex w-full rounded-[22px] border border-white/10 bg-white/6 p-1.5 backdrop-blur-xl sm:w-fit">
            {[
              { id: "phone", label: "Phone", icon: Phone },
              { id: "email", label: "Email", icon: Mail },
            ].map(({ id, label, icon: Icon }) => {
              const active = loginMethod === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setLoginMethod(id);
                    setError("");
                  }}
                  className={cn(
                    "interactive-btn inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-button"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {authNotice}

      <div className="w-full">
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
      </div>
    </AuthShell>
  );
}
