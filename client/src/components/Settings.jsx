/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Cloud,
  Edit3,
  Eye,
  Loader2,
  Lock,
  LogOut,
  Palette,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  User,
} from "lucide-react";
import api from "../services/api";
import { THEME_NAMES, getThemeClassName, useChatTheme } from "../hooks/useChatTheme";
import { useGsapScrollReveal } from "../hooks/useGsapScrollReveal";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DialogShell,
  DialogShellContent,
  DialogShellDescription,
  DialogShellHeader,
  DialogShellTitle,
} from "@/components/ui/dialog-shell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const THEME_KEYS = ["stealth_dark", "void", "minimal_dark", "minimal_light"];
const TAB_ITEMS = [
  { value: "profile", label: "Profile" },
  { value: "privacy", label: "Privacy" },
  { value: "theme", label: "Theme" },
  { value: "backup", label: "Backup" },
];

function SectionFrame({ eyebrow, title, description, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary shadow-lg">{eyebrow}</p>
        <div className="space-y-1">
          <h3 className="font-headline text-2xl font-black tracking-tight text-gradient">{title}</h3>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function StatusBanner({ tone = "success", children }) {
  const toneClassName = {
    success: "border-secondary/20 bg-secondary/12 text-secondary",
    error: "border-destructive/20 bg-destructive/12 text-destructive",
    info: "border-primary/20 bg-primary/12 text-primary",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className={cn("surface-panel rounded-[22px] border px-4 py-3 text-sm backdrop-blur-xl transition-all duration-300", toneClassName[tone] || toneClassName.info)}
    >
      {children}
    </motion.div>
  );
}

function PreferenceRow({ icon: Icon, title, description, checked, onCheckedChange }) {
  return (
    <Card data-settings-reveal className="surface-panel flex items-center justify-between gap-4 p-5 transition-all duration-300 hover:shadow-panel hover:scale-[1.01]">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "surface-panel flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300",
            checked ? "border-primary/20 bg-primary/12 text-primary shadow-sm" : "border-white/10 bg-white/6 text-muted-foreground hover:border-primary/10"
          )}
        >
          <Icon size={22} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </Card>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <Card data-settings-reveal className="surface-panel relative overflow-hidden p-5 transition-all duration-300 hover:shadow-panel hover:scale-[1.02]">
      <div className="absolute -bottom-3 -right-3 opacity-10">
        <Icon size={52} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon size={12} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
        </div>
        <p className="text-2xl font-black tracking-tight text-gradient">{value}</p>
      </div>
    </Card>
  );
}

function ThemeCard({ themeKey, currentTheme, onSelect }) {
  const isSelected = currentTheme === themeKey;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(themeKey)}
      data-settings-reveal
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "surface-panel relative space-y-4 p-4 text-left transition-all duration-300",
        isSelected ? "ring-2 ring-primary shadow-panel" : "hover:border-primary/15 hover:shadow-lg"
      )}
    >
      <div className={cn("theme-preview rounded-2xl border border-white/10 p-3", getThemeClassName(themeKey))}>
        <div className="theme-preview__header" />
        <div className="mt-3 space-y-2">
          <div className="theme-preview__bubble theme-preview__bubble--other w-2/3" />
          <div className="theme-preview__bubble theme-preview__bubble--own ml-auto w-1/2" />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">
          {THEME_NAMES[themeKey] || themeKey}
        </p>
        <p className="text-xs text-muted-foreground">
          {themeKey === "minimal_light" ? "Bright, minimal workspace." : "Dark ambient chat canvas."}
        </p>
      </div>

      {isSelected ? (
        <div className="absolute right-3 top-3 text-primary">
          <CheckCircle2 size={16} fill="currentColor" />
        </div>
      ) : null}
    </motion.button>
  );
}

export default function Settings({ user, onUpdate, onClose, onLogout, initialTab = "profile" }) {
  const [, setTheme] = useChatTheme();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [name, setName] = useState(user?.name || "");
  const [status, setStatus] = useState(user?.status || "Hey there! I'm using RelayChat.");
  const [signalVisibility, setSignalVisibility] = useState(user?.signalVisibility ?? true);
  const [vaultProtocol, setVaultProtocol] = useState(user?.vaultProtocol ?? false);
  const [currentTheme, setCurrentTheme] = useState(user?.globalTheme || "stealth_dark");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [backupPin, setBackupPin] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [isVerifyingOldPin, setIsVerifyingOldPin] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const mainRef = useRef(null);
  const revealScopeRef = useRef(null);

  useGsapScrollReveal({
    scopeRef: revealScopeRef,
    scrollerRef: mainRef,
    selector: "[data-settings-reveal]",
    deps: [activeTab],
  });

  useEffect(() => {
    setName(user?.name || "");
    setStatus(user?.status || "Hey there! I'm using RelayChat.");
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
        console.error("Failed to fetch fresh profile:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdate = async (overrides = {}) => {
    const payload = {
      name: overrides.name !== undefined ? overrides.name : name,
      status: overrides.status !== undefined ? overrides.status : status,
      signalVisibility: overrides.signalVisibility !== undefined ? overrides.signalVisibility : signalVisibility,
      vaultProtocol: overrides.vaultProtocol !== undefined ? overrides.vaultProtocol : vaultProtocol,
      globalTheme: overrides.globalTheme !== undefined ? overrides.globalTheme : currentTheme,
    };

    if (!payload.name.trim()) {
      setMessage("Identity error: Name cannot be empty.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await api.put("/user/profile", payload);
      const updatedUser = response.data.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUpdate(updatedUser);

      if (overrides.globalTheme) {
        setTheme(overrides.globalTheme);
      }

      setMessage("System synchronized successfully.");
      window.setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || "System error: Synchronization failed.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSignalVisibility = () => {
    const nextValue = !signalVisibility;
    setSignalVisibility(nextValue);
    handleUpdate({ signalVisibility: nextValue });
  };

  const toggleVaultProtocol = () => {
    const nextValue = !vaultProtocol;
    setVaultProtocol(nextValue);
    handleUpdate({ vaultProtocol: nextValue });
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
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
      setMessage("Avatar enhanced successfully.");
      window.setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error(error);
      setMessage("System error: Avatar upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    if (window.confirm("Terminate connection? This will log you out of the terminal.")) {
      onLogout();
    }
  };

  const handleBackupKey = async () => {
    if (!backupPin || backupPin.length < 4) {
      setBackupStatus("Error: PIN must be at least 4 digits.");
      return;
    }

    if (user?.encryptedBackupKey && !isResetMode && !isVerifyingOldPin) {
      setIsVerifyingOldPin(true);
      setBackupStatus("Security Check: Previous PIN required.");
      return;
    }

    setIsBackingUp(true);
    setBackupStatus("");
    try {
      const { backupPrivateKeyToCloud, restorePrivateKeyFromCloud } = await import("../services/e2ee");

      if (isVerifyingOldPin) {
        try {
          await restorePrivateKeyFromCloud(api, user?._id || user?.id, oldPin);
        } catch {
          setBackupStatus("Verification failed: Incorrect previous PIN.");
          setIsBackingUp(false);
          return;
        }
      }

      await backupPrivateKeyToCloud(api, user?._id || user?.id, backupPin);
      setBackupStatus("Secure Backup Successfully Reset.");
      setBackupPin("");
      setOldPin("");
      setIsVerifyingOldPin(false);
      setIsResetMode(false);

      const refreshed = await api.get("/user/profile");
      if (refreshed.data?.user) {
        localStorage.setItem("user", JSON.stringify(refreshed.data.user));
        onUpdate(refreshed.data.user);
      }

      window.setTimeout(() => setBackupStatus(""), 4000);
    } catch (error) {
      console.error(error);
      setBackupStatus(error.message || "Backup failed: Internal system error.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleForgotPinReset = async () => {
    if (!verifyPhone) {
      setBackupStatus("Security Note: Enter mobile for identity proof.");
      return;
    }

    setIsBackingUp(true);
    try {
      await api.post("/user/verify-reset", { phoneNumber: verifyPhone });
      setIsResetMode(true);
      setIsVerifyingOldPin(false);
      setBackupStatus("Mobile Verified. Override permission granted.");
    } catch (error) {
      setBackupStatus(error.response?.data?.message || "Identity theft protection: Phone mismatch.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const isMessageError = message.includes("Error") || message.includes("failed");
  const isBackupError = backupStatus.includes("Error") || backupStatus.includes("failed") || backupStatus.includes("mismatch");

  return (
    <DialogShell open onOpenChange={(open) => !open && onClose()}>
      <DialogShellContent className="h-[92vh] w-[min(calc(100%-1rem),72rem)] max-w-none overflow-hidden p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className={cn("relative", getThemeClassName(currentTheme))}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 chat-canvas opacity-90" />
            <div className="absolute inset-0 app-noise opacity-30" />
            <div className="absolute left-[-12%] top-[-16%] h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-[140px]" />
            <div className="absolute bottom-[-16%] right-[-12%] h-[34rem] w-[34rem] rounded-full bg-secondary/12 blur-[160px]" />
            <div className="absolute inset-0 bg-background/45" />
          </div>

          <div className="relative grid h-full min-h-0 overflow-hidden lg:grid-cols-[280px,1fr]">
            <aside className="overflow-y-auto border-b border-white/10 bg-card/70 p-4 backdrop-blur-2xl lg:border-b-0 lg:border-r lg:p-6">
              <DialogShellHeader className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Relaychat Control</p>
                <DialogShellTitle className="font-headline text-3xl font-black tracking-tight">Settings</DialogShellTitle>
                <DialogShellDescription>
                  Update your identity, privacy posture, visual theme, and recovery key setup.
                </DialogShellDescription>
              </DialogShellHeader>

              <div className="mt-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar
                      src={avatar ? `http://localhost:5002${avatar}` : undefined}
                      alt={name || "Profile"}
                      fallback={name?.[0] || "?"}
                      size="xl"
                      className="border-primary/20 shadow-[0_0_32px_hsl(var(--primary)/0.2)]"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button
                      size="icon"
                      type="button"
                      className="absolute -bottom-1 -right-1 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Edit3 size={14} />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-headline text-lg font-black tracking-tight text-foreground">{name || "Identity_Null"}</h2>
                    <p className="text-xs text-muted-foreground">{status || "No status broadcast set."}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                      {signalVisibility ? "Visible Node" : "Ghost Protocol"}
                    </p>
                  </div>
                </div>

                <Card className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Quick state</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      {THEME_NAMES[currentTheme] || currentTheme}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="surface-inline rounded-[18px] px-3 py-2">
                      <p className="text-muted-foreground">Visibility</p>
                      <p className="mt-1 font-semibold text-foreground">{signalVisibility ? "Enabled" : "Hidden"}</p>
                    </div>
                    <div className="surface-inline rounded-[18px] px-3 py-2">
                      <p className="text-muted-foreground">Vault</p>
                      <p className="mt-1 font-semibold text-foreground">{vaultProtocol ? "Masked" : "Standard"}</p>
                    </div>
                  </div>
                </Card>

                <TabsList className="grid w-full grid-cols-2 gap-2 rounded-2xl bg-transparent p-0 lg:grid-cols-1 lg:border-0 lg:bg-transparent">
                  {TAB_ITEMS.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="justify-start rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-left data-[state=active]:border-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <Button variant="destructive" className="w-full justify-center gap-2 rounded-2xl" onClick={handleLeave}>
                  <LogOut size={16} />
                  Termination Sequence
                </Button>
              </div>
            </aside>

            <main ref={mainRef} className="min-h-0 overflow-y-auto bg-background/20 p-4 lg:p-6">
              <div ref={revealScopeRef} className="space-y-6">
                <AnimatePresence mode="wait">
                  {message ? (
                    <StatusBanner key={message} tone={isMessageError ? "error" : "success"}>
                      {message}
                    </StatusBanner>
                  ) : null}
                </AnimatePresence>

                <TabsContent value="profile">
                  <SectionFrame
                    eyebrow="Identity"
                    title="Profile settings"
                    description="Manage the public label and status that appear across Relaychat."
                  >
                    <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                      <Card data-settings-reveal className="space-y-5 p-6">
                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                              Archive label
                            </label>
                            <Input
                              value={name}
                              onChange={(event) => setName(event.target.value)}
                              placeholder="Your identity name..."
                              icon={User}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                              System frequency
                            </label>
                            <Input
                              value={status}
                              onChange={(event) => setStatus(event.target.value)}
                              placeholder="Status broadcast..."
                              icon={Terminal}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button onClick={() => handleUpdate()} disabled={loading}>
                            {loading ? (
                              <>
                                <Loader2 className="animate-spin" />
                                Synchronizing
                              </>
                            ) : (
                              "Submit to ledger"
                            )}
                          </Button>
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            Update avatar
                          </Button>
                        </div>
                      </Card>

                      <Card data-settings-reveal className="space-y-4 p-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                          Identity preview
                        </p>
                        <div className="surface-inline rounded-3xl p-5">
                          <div className="flex items-center gap-4">
                            <Avatar
                              src={avatar ? `http://localhost:5002${avatar}` : undefined}
                              alt={name || "Profile"}
                              fallback={name?.[0] || "?"}
                              size="lg"
                              className="border-primary/20"
                            />
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{name || "Identity_Null"}</p>
                              <p className="text-sm text-muted-foreground">{status || "No status broadcast set."}</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs leading-6 text-muted-foreground">
                          These values are saved to your profile and reused across conversations, presence, and future device sessions.
                        </p>
                      </Card>
                    </div>
                  </SectionFrame>
                </TabsContent>

                <TabsContent value="privacy">
                  <SectionFrame
                    eyebrow="Protection"
                    title="Privacy controls"
                    description="Control presence visibility and identity masking without changing your account flows."
                  >
                    <div className="grid gap-4 lg:grid-cols-2">
                      <PreferenceRow
                        icon={Eye}
                        title="Signal visibility"
                        description="Sync your online status to other users."
                        checked={signalVisibility}
                        onCheckedChange={toggleSignalVisibility}
                      />
                      <PreferenceRow
                        icon={Lock}
                        title="Vault protocol"
                        description="Mask your identity in higher privacy mode."
                        checked={vaultProtocol}
                        onCheckedChange={toggleVaultProtocol}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <MetricCard icon={Lock} label="Encryption" value="AES-256-GCM" />
                      <MetricCard icon={Cloud} label="E2EE storage" value="Enabled" />
                      <MetricCard icon={ShieldCheck} label="Profile state" value={vaultProtocol ? "Masked" : "Standard"} />
                    </div>
                  </SectionFrame>
                </TabsContent>

                <TabsContent value="theme">
                  <SectionFrame
                    eyebrow="Appearance"
                    title="Theme studio"
                    description="Preview and apply the global chat theme used across Relaychat."
                  >
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {THEME_KEYS.map((themeKey) => (
                        <ThemeCard
                          key={themeKey}
                          themeKey={themeKey}
                          currentTheme={currentTheme}
                          onSelect={(nextTheme) => {
                            setCurrentTheme(nextTheme);
                            handleUpdate({ globalTheme: nextTheme });
                          }}
                        />
                      ))}
                    </div>
                  </SectionFrame>
                </TabsContent>

                <TabsContent value="backup">
                  <SectionFrame
                    eyebrow="Recovery"
                    title="Backup and restore"
                    description="Protect your encrypted key material with a cloud backup PIN and verification fallback."
                  >
                    <Card data-settings-reveal className="space-y-5 p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">Cloud key backup</p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            This PIN encrypts your private keys before upload. Keep it safe for multi-device synchronization.
                          </p>
                        </div>
                        <AnimatePresence mode="wait">
                          {backupStatus ? (
                            <StatusBanner key={backupStatus} tone={isBackupError ? "error" : "info"}>
                              {backupStatus}
                            </StatusBanner>
                          ) : null}
                        </AnimatePresence>
                      </div>

                      {user?.encryptedBackupKey && !isResetMode ? (
                        <Card data-settings-reveal className="space-y-4 border-destructive/15 bg-destructive/8 p-5">
                          <div className="flex items-center gap-2 text-destructive">
                            <ShieldAlert size={16} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                              Previous identification required
                            </p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <Input
                              type="password"
                              placeholder="Current security PIN"
                              value={oldPin}
                              onChange={(event) => setOldPin(event.target.value)}
                              icon={Lock}
                            />
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                placeholder="Registered mobile number"
                                value={verifyPhone}
                                onChange={(event) => setVerifyPhone(event.target.value)}
                                className="flex-1"
                              />
                              <Button variant="outline" onClick={handleForgotPinReset}>
                                Verify
                              </Button>
                            </div>
                          </div>

                          <p className="text-xs leading-6 text-muted-foreground">
                            Forgot your PIN? Verify your mobile number to bypass the previous encryption checkpoint.
                          </p>
                        </Card>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-[1fr,auto]">
                        <Input
                          type="password"
                          placeholder={
                            user?.encryptedBackupKey ? "Enter new security PIN" : "Enter security PIN (4+ digits)"
                          }
                          value={backupPin}
                          onChange={(event) => setBackupPin(event.target.value)}
                          icon={Lock}
                          className="font-mono"
                        />
                        <Button onClick={handleBackupKey} disabled={isBackingUp || !backupPin} className="min-w-[11rem]">
                          {isBackingUp ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Validating
                            </>
                          ) : user?.encryptedBackupKey ? (
                            "Reset key"
                          ) : (
                            "Save backup"
                          )}
                        </Button>
                      </div>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2">
                      <MetricCard icon={Cloud} label="Backup state" value={user?.encryptedBackupKey ? "Configured" : "Not set"} />
                      <MetricCard icon={Settings2} label="Version" value="RP-2.0.4" />
                    </div>
                  </SectionFrame>
                </TabsContent>
              </div>
            </main>
          </div>
        </Tabs>
      </DialogShellContent>
    </DialogShell>
  );
}
