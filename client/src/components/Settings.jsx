/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Cloud, Edit2, Eye, EyeOff, Loader2, Lock, LogOut, Shield, ShieldCheck, User, X } from "lucide-react";
import api from "../services/api";
import { getThemeClassName, useChatTheme } from "../hooks/useChatTheme";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { config } from "../config";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "backup", label: "Backup", icon: Lock },
];

export default function Settings({ user, onUpdate, onClose, onLogout, initialTab = "profile" }) {
  const [, setTheme] = useChatTheme();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [name, setName] = useState(user?.name || "");
  const [status, setStatus] = useState(user?.status || "");
  const [signalVisibility, setSignalVisibility] = useState(user?.signalVisibility ?? true);
  const [vaultProtocol, setVaultProtocol] = useState(user?.vaultProtocol ?? false);
  const [currentTheme, setCurrentTheme] = useState(user?.globalTheme || "stealth_dark");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [backupPin, setBackupPin] = useState("");
  const autoPin = (user?._id || user?.id) ? localStorage.getItem(`auto-pin-${user?._id || user?.id}`) : null;
  const [oldPin, setOldPin] = useState(autoPin || "");
  const [isVerifyingOldPin, setIsVerifyingOldPin] = useState(!!autoPin);
  const [isResetMode, setIsResetMode] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState("");
  const [backupStatus, setBackupStatus] = useState(autoPin ? "Auto-generated PIN loaded. Enter a new PIN below to update it." : "");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showOldPin, setShowOldPin] = useState(!autoPin);

  useEffect(() => {
    setName(user?.name || "");
    setStatus(user?.status || "");
    setSignalVisibility(user?.signalVisibility ?? true);
    setVaultProtocol(user?.vaultProtocol ?? false);
    setCurrentTheme(user?.globalTheme || "stealth_dark");
    setAvatar(user?.avatar || "");
  }, [user?._id]);

  useEffect(() => {
    setActiveTab(initialTab || "profile");
  }, [initialTab]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/user/profile");
        const userData = response.data.user;
        setName(userData.name || "");
        setStatus(userData.status || "");
        setSignalVisibility(userData.signalVisibility ?? true);
        setVaultProtocol(userData.vaultProtocol ?? false);
        setCurrentTheme(userData.globalTheme || "stealth_dark");
        setAvatar(userData.avatar || "");
        if (userData) {
          localStorage.setItem("user", JSON.stringify(userData));
          onUpdate?.(userData);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage("Name is required");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await api.put("/user/profile", { name, status, signalVisibility, vaultProtocol, globalTheme: currentTheme });
      const updatedUser = response.data.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      setMessage("Saved successfully!");
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      const response = await api.post("/user/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedUser = response.data.user;
      setAvatar(updatedUser.avatar);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      setMessage("Avatar updated!");
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      setMessage("Failed to upload avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!backupPin || backupPin.length < 4) {
      setBackupStatus("PIN must be at least 4 digits");
      return;
    }
    if (user?.encryptedBackupKey && !isResetMode && !isVerifyingOldPin) {
      setIsVerifyingOldPin(true);
      setBackupStatus("Enter current PIN first");
      return;
    }
    setIsBackingUp(true);
    setBackupStatus("");
    try {
      const { backupPrivateKeyToCloud, restorePrivateKeyFromCloud } = await import("../services/e2ee");
      if (isVerifyingOldPin || oldPin) {
        try {
          await restorePrivateKeyFromCloud(api, user?._id || user?.id, oldPin);
        } catch {
          setBackupStatus("Incorrect current PIN");
          setIsBackingUp(false);
          return;
        }
      }
      await backupPrivateKeyToCloud(api, user?._id || user?.id, backupPin);
      setBackupStatus("Backup saved successfully!");
      setBackupPin("");
      setOldPin("");
      localStorage.removeItem(`auto-pin-${user?._id || user?.id}`);
      setIsVerifyingOldPin(false);
      setIsResetMode(false);
      const refreshed = await api.get("/user/profile");
      if (refreshed.data?.user) {
        localStorage.setItem("user", JSON.stringify(refreshed.data.user));
        onUpdate(refreshed.data.user);
      }
      setTimeout(() => setBackupStatus(""), 3000);
    } catch (error) {
      setBackupStatus(error.message || "Backup failed");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleVerifyReset = async () => {
    if (!verifyPhone) {
      setBackupStatus("Enter phone number");
      return;
    }
    setIsBackingUp(true);
    try {
      await api.post("/user/verify-reset", { phoneNumber: "+91" + verifyPhone });
      setIsResetMode(true);
      setIsVerifyingOldPin(false);
      setBackupStatus("Verified! Enter new PIN");
    } catch (error) {
      setBackupStatus(error.response?.data?.message || "Verification failed");
    } finally {
      setIsBackingUp(false);
    }
  };

  const isError = (msg) => msg.includes("Failed") || msg.includes("Incorrect") || msg.includes("required") || msg.includes("must");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={cn(
        "relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/20 shadow-2xl",
        getThemeClassName(currentTheme)
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/5" />
        
        <div className="relative z-10 flex items-center gap-4 border-b border-white/10 bg-black/40 px-5 py-4">
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <p className="text-xs text-white/50">Manage your account</p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/5 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="relative z-10 flex flex-1 overflow-hidden">
          <nav className="hidden w-56 flex-col border-r border-white/10 bg-black/20 p-4 sm:flex">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <div className="relative">
                <Avatar
                  src={avatar ? config.endpoints.files(avatar) : undefined}
                  alt={name || "User"}
                  fallback={name?.[0] || "?"}
                  size="2xl"
                  className="h-20 w-20 rounded-full border-2 border-primary/50 shadow-lg"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                >
                  <Edit2 size={12} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
              </div>
              <div>
                <p className="font-semibold text-white">{name || "User"}</p>
                <p className="text-xs text-white/50 line-clamp-1">{status || "Hey there!"}</p>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => onLogout()}
              className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
            >
              <LogOut size={18} />
              Logout
            </button>
          </nav>

          <main className="flex-1 overflow-y-auto p-5 sm:p-6">
            {message && (
              <div className={cn(
                "mb-4 rounded-xl px-4 py-3 text-sm font-medium",
                isError(message) ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-green-500/20 text-green-300 border border-green-500/30"
              )}>
                {message}
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar
                        src={avatar ? config.endpoints.files(avatar) : undefined}
                        alt={name || "User"}
                        fallback={name?.[0] || "?"}
                        size="2xl"
                        className="h-24 w-24 rounded-full border-4 border-background shadow-xl"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{name || "Your Name"}</h3>
                      <p className="text-white/60">{status || "No status set"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h4 className="font-semibold text-white">Edit Profile</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">Status</label>
                      <input
                        type="text"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        placeholder="What's on your mind?"
                        className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                    >
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving... </> : "Save Changes"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-xl font-bold text-primary">AES-256</p>
                    <p className="text-xs text-white/50">Encryption</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-xl font-bold text-green-400">Active</p>
                    <p className="text-xs text-white/50">E2EE</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-xl font-bold text-white">{signalVisibility ? "On" : "Off"}</p>
                    <p className="text-xs text-white/50">Online</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                        <Eye size={22} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Online Status</p>
                        <p className="text-xs text-white/50">Show when you're online</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSignalVisibility(!signalVisibility)}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        signalVisibility ? "bg-green-500" : "bg-white/20"
                      )}
                    >
                      <span className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-white transition-all",
                        signalVisibility ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
                        <Lock size={22} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Privacy Mode</p>
                        <p className="text-xs text-white/50">Enhanced privacy</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setVaultProtocol(!vaultProtocol)}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        vaultProtocol ? "bg-green-500" : "bg-white/20"
                      )}
                    >
                      <span className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-white transition-all",
                        vaultProtocol ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving... </> : "Save Privacy Settings"}
                </button>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-green-500/10 p-4 text-center">
                    <ShieldCheck size={28} className="mx-auto mb-2 text-green-400" />
                    <p className="text-sm font-medium text-white">Protected</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 p-4 text-center">
                    <Lock size={28} className="mx-auto mb-2 text-blue-400" />
                    <p className="text-sm font-medium text-white">Encrypted</p>
                  </div>
                  <div className="rounded-xl bg-purple-500/10 p-4 text-center">
                    <Shield size={28} className="mx-auto mb-2 text-purple-400" />
                    <p className="text-sm font-medium text-white">Secured</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "backup" && (
              <div className="space-y-5">
                {backupStatus && (
                  <div className={cn(
                    "rounded-xl px-4 py-3 text-sm font-medium border",
                    isError(backupStatus) ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                  )}>
                    {backupStatus}
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/20 shadow-lg">
                      <Lock size={28} className="text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Encryption Key Backup</h3>
                      <p className="text-sm text-white/60">
                        {user?.encryptedBackupKey ? "Backup configured - You can reset it" : "No backup - Create one now"}
                      </p>
                    </div>
                  </div>

                  {autoPin && (
                    <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                      <p className="text-sm text-yellow-200">
                        <strong className="text-yellow-400">Current Auto-Generated PIN: </strong> 
                        <span className="font-mono text-lg font-bold tracking-widest text-white">{autoPin}</span>
                      </p>
                      <p className="mt-1 text-xs text-yellow-400/80">
                        This PIN was automatically applied. Enter a new PIN below to change it to something memorable.
                      </p>
                    </div>
                  )}

                  {user?.encryptedBackupKey && !isResetMode && !autoPin && (
                    <div className="mb-4 space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-red-400">
                        <ShieldCheck size={16} />
                        Reset Backup Requires Verification
                      </p>
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type={showOldPin ? "text" : "password"}
                            placeholder="Enter current PIN"
                            value={oldPin}
                            onChange={(e) => setOldPin(e.target.value)}
                            className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-12 text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPin(!showOldPin)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1"
                          >
                            {showOldPin ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <div className="relative flex items-center h-12 w-full rounded-xl border border-white/10 bg-white/5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                          <div className="flex items-center pl-4 pr-2 text-sm font-bold text-white/50 border-r border-white/10">
                            +91
                          </div>
                          <input
                            type="tel"
                            placeholder="Your phone number"
                            value={verifyPhone}
                            onChange={(e) => setVerifyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="flex-1 h-full bg-transparent px-3 text-white placeholder:text-white/30 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={handleVerifyReset}
                          disabled={isBackingUp}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-medium text-white/70 transition-all hover:bg-white/5 disabled:opacity-50"
                        >
                          {isBackingUp ? "Verifying..." : "Verify & Reset"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">
                        {user?.encryptedBackupKey && !isResetMode ? "New PIN" : "Create PIN (enter 4+ digits)"}
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? "text" : "password"}
                          placeholder="Enter PIN here..."
                          value={backupPin}
                          onChange={(e) => setBackupPin(e.target.value)}
                          maxLength={8}
                          className="flex h-14 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-12 text-lg text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1"
                        >
                          {showPin ? <EyeOff size={22} /> : <Eye size={22} />}
                        </button>
                      </div>
                    </div>
                    
                    {backupPin && (
                      <div className="flex gap-1.5">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-2 flex-1 rounded-full transition-all",
                              i < backupPin.length ? "bg-yellow-400" : "bg-white/10"
                            )}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={handleBackup}
                      disabled={isBackingUp || backupPin.length < 4}
                      className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 font-semibold text-black transition-all hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBackingUp ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Processing... </>
                      ) : user?.encryptedBackupKey ? (
                        "Reset Backup"
                      ) : (
                        "Save Backup"
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <div className="mb-2 flex items-center justify-center gap-2 text-white/50">
                      <Cloud size={18} />
                      <span className="text-xs font-medium uppercase">Status</span>
                    </div>
                    <p className={cn(
                      "text-lg font-bold",
                      user?.encryptedBackupKey ? "text-green-400" : "text-white/50"
                    )}>
                      {user?.encryptedBackupKey ? "Active" : "None"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <div className="mb-2 flex items-center justify-center gap-2 text-white/50">
                      <ShieldCheck size={18} />
                      <span className="text-xs font-medium uppercase">Security</span>
                    </div>
                    <p className="text-lg font-bold text-green-400">Protected</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
