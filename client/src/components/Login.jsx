import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Mail, ShieldCheck } from "lucide-react";
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
import EmailOtpForm from "@/components/auth/EmailOtpForm";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import RestoreSessionUI from "@/components/auth/RestoreSessionUI";
import { cn } from "@/lib/utils";
import { reloadToAppBase, replaceUrlToAppBase } from "../utils/navigation";
import { clearClientStorage } from "../utils/auth";
import { GoogleLogin } from "@react-oauth/google";
import PhoneOnboardingUI from "@/components/auth/PhoneOnboardingUI";


export default function Login({ onLogin, onSignup, canResume = false, sessionExpired = false, onAction }) {
  const [loginMethod, setLoginMethod] = useState("otp");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [canResendAt, setCanResendAt] = useState(0);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restoreAuthData, setRestoreAuthData] = useState(null);
  const [restorePin, setRestorePin] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Initializing device...");
  const [showPhoneOnboarding, setShowPhoneOnboarding] = useState(false);

  useEffect(() => {
    if (sessionExpired) {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      setIsWaitingForApproval(false);
      setOtpSent(false);
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

      if (!effectiveUser.phoneNumber) {
        setRestoreAuthData({ ...res.data, user: effectiveUser });
        setShowPhoneOnboarding(true);
        return;
      }

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
      replaceUrlToAppBase();
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

  const handlePhoneOnboardingComplete = async (updatedUser) => {
    // update local storage with the new phone number
    const finalUser = { ...restoreAuthData.user, phoneNumber: updatedUser.phoneNumber };
    localStorage.setItem("user", JSON.stringify(finalUser));
    
    // new users skip history approval
    localStorage.setItem("session-active", "true");
    reloadToAppBase();
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
      // Force a clean bootstrap into Chat. This avoids occasional "blank until refresh"
      // when transitioning out of recovery mode (socket + E2EE state can be mid-flight).
      reloadToAppBase();
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
            reloadToAppBase();
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

  const handleGoogleLogin = async (credentialResponse) => {
    onAction?.();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/google", { credential: credentialResponse.credential });
      await handleLoginSuccess(res);
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.response?.data?.message || "Failed to authenticate with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
	    if (!email) return setError("Please enter your email");
	    onAction?.();
	    setLoading(true);
	    setError("");
	    try {
	      const res = await api.post("/auth/send-email-otp", { email });
	      setOtpSent(true);
	      setError("Success: OTP Sent Successfully!");
	      const cooldownSeconds = Number(res?.data?.cooldownSeconds || 60);
	      setCanResendAt(Date.now() + cooldownSeconds * 1000);
	    } catch (err) {
	      console.error("OTP send error:", err);
	      if (err?.response?.status === 429) {
	        // Server cooldown: keep OTP input visible and sync the resend timer with backend.
	        const waitSeconds =
	          Number(err.response?.data?.retryAfterSeconds) ||
	          (() => {
	            const message = err.response?.data?.message || "";
	            const match = message.match(/(\d+)s/);
	            return match ? Number(match[1]) : 60;
	          })();
	        setOtpSent(true);
	        setCanResendAt(Date.now() + waitSeconds * 1000);
	      }
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
    if (!email || !otp) return setError("Please enter email and OTP");
    const normalizedOtp = String(otp).replace(/\D/g, "").slice(0, 6);
    if (normalizedOtp.length !== 6) return setError("Please enter a valid 6-digit OTP");
    onAction?.();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/verify-email-otp", { email, otp: normalizedOtp });
      await handleLoginSuccess(res);
    } catch (err) {
      console.error("OTP verify error:", err);
      setError(err.response?.data?.message || "Invalid OTP.");
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
      clearClientStorage();
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
    : loginMethod === "otp"
      ? [otpSent ? "Email entered" : "Enter email", otpSent ? "Verify code" : "Receive code", "Secure device check"]
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

  if (showPhoneOnboarding) {
    return <PhoneOnboardingUI user={restoreAuthData?.user} onComplete={handlePhoneOnboardingComplete} />;
  }

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
            try {
              const restoreUserId = restoreAuthData?.user?._id;
              if (restoreUserId) {
                markHistorySyncComplete(restoreUserId);
              }
            } catch {
              /* ignore */
            }
            reloadToAppBase();
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={loginMethod === "otp" ? "OTP Access" : "Password Access"}
      title={
        loginMethod === "otp" ? "Continue with your email" : "Welcome back"
      }
      description={
        loginMethod === "otp"
          ? "Use a security code delivered to your email to unlock RelayChat on any device."
          : "Use your email and password, then continue through secure device verification."
      }
      footer={
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <span onClick={onSignup} className="cursor-pointer font-bold text-secondary transition-colors hover:text-foreground">
            Sign up for free
          </span>
        </p>
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

        <div className="inline-flex w-full rounded-[22px] border border-white/10 bg-white/6 p-1.5 backdrop-blur-xl sm:w-fit">
          {[
            { id: "otp", label: "Email OTP", icon: Mail },
            { id: "password", label: "Password", icon: ShieldCheck },
          ].map(({ id, label, icon: Icon }) => {
            const active = loginMethod === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setLoginMethod(id);
                  setError("");
                  if (id !== "otp") {
                    setOtpSent(false);
                    setOtp("");
                  }
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
      </div>

      {authNotice}

      <div className="mb-6 flex flex-col items-center justify-center gap-4 border-b border-white/10 pb-6">
        <GoogleLogin
          onSuccess={handleGoogleLogin}
          onError={() => setError("Google Sign-In was unsuccessful. Try again later.")}
          useOneTap
          shape="pill"
          theme="filled_black"
          text="continue_with"
        />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">or continue with email</span>
      </div>

      <div className="w-full">
        {loginMethod === "otp" ? (
          <EmailOtpForm
            key="email-otp-flow"
            email={email}
            setEmail={setEmail}
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
              setLoginMethod("password");
              setError("");
              setOtpSent(false);
              setOtp("");
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
              setLoginMethod("otp");
              setError("");
              setOtpSent(false);
              setOtp("");
            }}
          />
        )}
      </div>
    </AuthShell>
  );
}
