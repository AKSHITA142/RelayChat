/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Edit3, 
  Terminal, 
  LogOut, 
  Eye,
  Lock, 
  CheckCircle, 
  ArrowLeft,
  User,
  ShieldCheck,
  Palette,
  Cloud,
  Settings2,
  ShieldAlert,
  Loader2
} from "lucide-react";
import api from "../services/api";
import { THEME_NAMES, THEMES } from "../hooks/useChatTheme";
import { useChatTheme } from "../hooks/useChatTheme"; // Import hook to apply theme
import { Button } from "./stitch/Button";
import { Card } from "./stitch/Card";
import { Input } from "./stitch/Input";

export default function Settings({ user, onUpdate, onClose, onLogout }) {
  const [_, setTheme] = useChatTheme();
  
  // Profile State
  const [name, setName] = useState(user?.name || "");
  const [status, setStatus] = useState(user?.status || "Hey there! I'm using RelayChat.");
  
  // Privacy Settings State
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

  // Fetch fresh data on load to ensure state is accurate
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/user/profile");
        const userData = res.data.user;
        setName(userData.name || "");
        setStatus(userData.status || "");
        setSignalVisibility(userData.signalVisibility ?? true);
        setVaultProtocol(userData.vaultProtocol ?? false);
        setCurrentTheme(userData.globalTheme || "stealth_dark");
        setAvatar(userData.avatar || "");
      } catch (err) {
        console.error("Failed to fetch fresh profile:", err);
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
      globalTheme: overrides.globalTheme !== undefined ? overrides.globalTheme : currentTheme
    };

    if (!payload.name.trim()) return setMessage("Identity error: Name cannot be empty.");
    
    setLoading(true);
    setMessage("");
    try {
      const res = await api.put("/user/profile", payload);
      const updatedUser = res.data.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      
      // If theme changed, apply it globally immediately
      if (overrides.globalTheme) {
        setTheme(overrides.globalTheme);
      }

      setMessage("System synchronized successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "System error: Synchronization failed.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSignalVisibility = () => {
    const newVal = !signalVisibility;
    setSignalVisibility(newVal);
    handleUpdate({ signalVisibility: newVal });
  };

  const toggleVaultProtocol = () => {
    const newVal = !vaultProtocol;
    setVaultProtocol(newVal);
    handleUpdate({ vaultProtocol: newVal });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await api.post("/user/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const updatedUser = res.data.user;
      setAvatar(updatedUser.avatar);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      setMessage("Avatar enhanced successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
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
    
    // Check if we need to verify old PIN first
    if (user?.encryptedBackupKey && !isResetMode && !isVerifyingOldPin) {
      setIsVerifyingOldPin(true);
      setBackupStatus("Security Check: Previous PIN required.");
      return;
    }

    setIsBackingUp(true);
    setBackupStatus("");
    try {
      const { backupPrivateKeyToCloud, restorePrivateKeyFromCloud } = await import("../services/e2ee");
      
      // If we are in verification mode, try old PIN first
      if (isVerifyingOldPin) {
        try {
          await restorePrivateKeyFromCloud(api, user?._id || user?.id, oldPin);
        } catch (e) {
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
      
      // Refresh user data to update encryptedBackupKey state
      const refreshed = await api.get("/user/profile");
      if (refreshed.data?.user) {
        localStorage.setItem("user", JSON.stringify(refreshed.data.user));
        onUpdate(refreshed.data.user);
      }
      
      setTimeout(() => setBackupStatus(""), 4000);
    } catch (err) {
      console.error(err);
      setBackupStatus(err.message || "Backup failed: Internal system error.");
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
    } catch (err) {
      setBackupStatus(err.response?.data?.message || "Identity theft protection: Phone mismatch.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const currentThemeData = THEMES[currentTheme] || THEMES.stealth_dark;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-[#0b0e14]/85 backdrop-blur-3xl overflow-y-auto"
      style={{ backgroundImage: currentThemeData.pattern, backgroundSize: currentThemeData.patternSize }}
    >
      {/* Full UI Security Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src="/backgrounds/security_lock.png" 
          alt="Security System Backdrop"
          className="w-full h-full object-cover opacity-25 contrast-100 brightness-40 scale-105 blur-[8px]"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0b0e14] via-transparent to-[#0b0e14] opacity-80" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="w-full max-w-6xl min-h-[85vh] grid grid-cols-1 lg:grid-cols-12 gap-12 relative my-auto z-10">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-4 -right-4 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all z-50 border border-white/10 shadow-xl active:scale-90"
        >
          <ArrowLeft size={24} />
        </button>

        {/* Left Column: Profile Card */}
        <section className="lg:col-span-5 space-y-8 h-full">
          <Card className="p-8 relative overflow-hidden h-full flex flex-col items-center justify-center border-white/10 shadow-3xl bg-[#0b0e14]/90 backdrop-blur-3xl">
             {/* Decorate Spark */}
             <div className="absolute -top-24 -right-24 w-64 h-64 blur-[120px] rounded-full opacity-40 transition-colors" style={{ backgroundColor: currentThemeData.primary }}></div>
             <div className="absolute -bottom-24 -left-24 w-64 h-64 blur-[120px] rounded-full opacity-30 transition-colors" style={{ backgroundColor: currentThemeData.secondary || currentThemeData.primary }}></div>
            
             <div className="flex flex-col items-center text-center space-y-8 w-full relative z-10">
                <div className="relative group">
                  <div className="absolute -inset-1.5 opacity-40 group-hover:opacity-80 transition duration-1000 animate-pulse rounded-full blur-md" style={{ background: currentThemeData.primary }}></div>
                  <div className="relative w-44 h-44 md:w-52 md:h-52 rounded-full overflow-hidden border-2 border-white/10 bg-[#1f1f25]/40 flex items-center justify-center shadow-inner backdrop-blur-md">
                    {avatar ? (
                      <img 
                        src={`http://localhost:5002${avatar}`} 
                        alt={name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl font-black text-white/20 bg-gradient-to-br from-white/5 to-white/10 uppercase font-headline">
                        {name?.[0] || "?"}
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleAvatarChange} 
                    className="hidden" 
                    accept="image/*"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-4 right-4 text-[#131318] p-3 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all" 
                    style={{ backgroundColor: currentThemeData.primary }}
                  >
                    <Edit3 size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  <h2 className="font-headline text-3xl md:text-4xl font-black tracking-tight uppercase text-white drop-shadow-lg">
                    {name || "Identity_Null"}
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px]" style={{ backgroundColor: signalVisibility ? (currentThemeData.primary === '#ffffff' ? '#ffffff' : '#10b981') : '#64748b', boxShadow: signalVisibility ? `0 0 8px ${currentThemeData.primary === '#ffffff' ? '#ffffff' : '#10b981'}` : 'none' }} />
                    <p className="text-[10px] font-bold tracking-[0.25em] text-slate-500 uppercase">
                      Status: <span className={signalVisibility ? "text-emerald-400" : "text-slate-400"} style={{ color: signalVisibility ? (currentThemeData.primary === '#ffffff' ? '#ffffff' : '#10b981') : undefined }}>{signalVisibility ? "Visible Node" : "Ghost Protocol"}</span>
                    </p>
                  </div>
                </div>

                <div className="w-full space-y-6 pt-4 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.25em] ml-1 font-black" style={{ color: currentThemeData.primary }}>Archive Label</label>
                    <Input 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Identity Name..."
                      icon={User}
                      className="bg-black/20 border-white/10 focus:border-cyan-400/50 text-white"
                      style={{ focusBorderColor: currentThemeData.primary }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.25em] ml-1 font-black" style={{ color: currentThemeData.primary }}>System Frequency</label>
                    <Input 
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      placeholder="Status broadcast..."
                      icon={Terminal}
                      className="bg-black/20 border-white/10 focus:border-purple-400/50 text-white"
                      style={{ focusBorderColor: currentThemeData.primary }}
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      onClick={() => handleUpdate()} 
                      disabled={loading}
                      className="w-full shadow-lg"
                      style={{ backgroundColor: currentThemeData.primary, borderColor: currentThemeData.primary, color: '#131318' }}
                    >
                      {loading ? "Synchronizing Archive..." : "Submit to Ledger"}
                    </Button>
                  </div>

                  {message && (
                    <motion.p 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-xs text-center font-bold px-4 py-2 rounded-lg bg-white/5 border ${message.includes("Error") || message.includes("failed") ? "text-rose-400 border-rose-500/20" : "text-emerald-400 border-emerald-500/20"}`}
                    >
                      {message}
                    </motion.p>
                  )}
                </div>
             </div>

             <div className="mt-12 w-full pt-8 border-t border-white/5 relative z-10">
                <button 
                  onClick={handleLeave}
                  className="flex items-center justify-center gap-4 w-full px-8 py-3.5 bg-rose-500/5 rounded-2xl border border-rose-500/20 text-rose-400 font-black text-[11px] tracking-[0.2em] uppercase hover:bg-rose-500/10 transition-all duration-300 active:scale-95 shadow-lg group"
                >
                  <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
                  Termination Sequence
                </button>
             </div>
          </Card>
        </section>

        {/* Right Column: Categories */}
        <section className="lg:col-span-7 space-y-12 h-full flex flex-col justify-center">
          
          {/* Privacy Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-cyan-400/10 rounded-2xl border border-cyan-400/20">
                <ShieldCheck className="text-cyan-400" size={24} />
              </div>
              <h3 className="text-2xl font-black tracking-tighter uppercase text-white">Privacy & Keys</h3>
              <div className="h-px flex-grow bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={toggleSignalVisibility}
                className="bg-[#1f1f25]/40 backdrop-blur border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${signalVisibility ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/10' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                    <Eye size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white tracking-tight">Signal Visibility</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sync online status</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative p-1 transition-all duration-300 ${signalVisibility ? 'bg-cyan-400 shadow-[0_0_15px_rgba(0,251,251,0.2)]' : 'bg-white/10 border border-white/10'}`}>
                  <motion.div 
                    animate={{ x: signalVisibility ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-4 h-4 bg-white rounded-full shadow-md" 
                  />
                </div>
              </div>

              <div 
                onClick={toggleVaultProtocol}
                className="bg-[#1f1f25]/40 backdrop-blur border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${vaultProtocol ? 'bg-purple-500/10 text-purple-400 border-purple-500/10' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                    <Lock size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white tracking-tight">Vault Protocol</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mask identity</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative p-1 transition-all duration-300 ${vaultProtocol ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/10 border border-white/10'}`}>
                   <motion.div 
                    animate={{ x: vaultProtocol ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-4 h-4 bg-white rounded-full shadow-md" 
                  />
                </div>
              </div>
            </div>

            {/* Cloud Key Backup Integrated Card */}
            <div className="bg-[#1f1f25]/40 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-5 group hover:border-white/10 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                    <Cloud size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white tracking-tight uppercase">Cloud Key Backup</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Secure recovery system</p>
                  </div>
                </div>
                {backupStatus && (
                  <motion.p 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${backupStatus.includes("Error") ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}
                  >
                    {backupStatus}
                  </motion.p>
                )}
              </div>

              {user?.encryptedBackupKey && !isResetMode && (
                <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert size={14} className="text-rose-400" />
                    <p className="text-[10px] font-black uppercase text-white/70">Previous Identification Required</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Lock size={12} className="absolute left-3 top-3 text-rose-500/50" />
                      <input 
                        type="password"
                        placeholder="Current Security PIN"
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-9 py-2 text-[10px] text-rose-200 outline-none focus:border-rose-500/30 transition-all font-mono"
                      />
                    </div>
                    
                    <div className="relative flex gap-2">
                       <input 
                        type="text"
                        placeholder="Or Mobile Register Number"
                        value={verifyPhone}
                        onChange={(e) => setVerifyPhone(e.target.value)}
                        className="flex-grow bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-[10px] text-cyan-200 outline-none focus:border-cyan-500/30 transition-all"
                       />
                       <button 
                        onClick={handleForgotPinReset}
                        className="px-3 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase rounded-xl transition-all"
                       >
                         Verify
                       </button>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Forgot your PIN? Verify your mobile to bypass the old encryption.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 relative">
                   <Lock size={14} className="absolute left-3 top-3 text-slate-500" />
                   <input 
                    type="password"
                    placeholder={user?.encryptedBackupKey ? "Enter New Security PIN" : "Enter Security PIN (4+ digits)"}
                    value={backupPin}
                    onChange={(e) => setBackupPin(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-10 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50 transition-all font-mono"
                   />
                </div>
                <button 
                  onClick={handleBackupKey}
                  disabled={isBackingUp || (!backupPin)}
                  className="md:col-span-4 bg-emerald-500 text-[#0b0e14] font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {isBackingUp ? (
                    <>
                      <Loader2 className="animate-spin" size={12} />
                      Validating
                    </>
                  ) : (user?.encryptedBackupKey ? "Reset Key" : "Save Backup")}
                </button>
              </div>
              <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest leading-relaxed">
                This PIN encrypts your private keys before uploading. <span className="text-emerald-500/50">Keep it safe for multi-device synchronization.</span>
              </p>
            </div>
          </div>

          {/* Theme Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20" style={{ backgroundColor: `${currentThemeData.primary}1a`, borderColor: `${currentThemeData.primary}33` }}>
                <Palette className="text-purple-400" size={24} style={{ color: currentThemeData.primary }} />
              </div>
              <h3 className="text-2xl font-black tracking-tighter uppercase text-white">Visual Spectrum</h3>
              <div className="h-px flex-grow bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {['stealth_dark', 'void', 'minimal_dark', 'minimal_light'].map((themeKey) => {
                const t = THEMES[themeKey] || THEMES.stealth_dark;
                const isSelected = currentTheme === themeKey;
                return (
                  <div 
                    key={themeKey}
                    onClick={() => {
                      setCurrentTheme(themeKey);
                      handleUpdate({ globalTheme: themeKey });
                    }}
                    className={`relative bg-[#1f1f25]/40 backdrop-blur rounded-2xl p-6 flex flex-col items-center text-center space-y-4 cursor-pointer border-2 transition-all hover:bg-white/5 ${
                      isSelected ? 'shadow-[0_0_25px]' : 'border-white/5'
                    }`}
                    style={{ 
                      borderColor: isSelected ? t.primary : 'rgba(255,255,255,0.05)',
                      boxShadow: isSelected ? `0 0 25px ${t.primary}33` : 'none'
                    }}
                  >
                    <div 
                      className="w-14 h-14 rounded-full shadow-2xl border-2 border-white/10"
                      style={{ 
                        background: t.background.startsWith('linear-gradient') ? t.background : 
                                    t.sendBtn.startsWith('linear-gradient') ? t.sendBtn : t.primary 
                      }}
                    />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">
                      {THEME_NAMES[themeKey] || themeKey}
                    </p>
                    {isSelected && (
                      <div className="absolute top-3 right-3 drop-shadow-glow" style={{ color: t.primary }}>
                        <CheckCircle size={16} fill="currentColor" />
                        <div className="absolute inset-0 blur-sm rounded-full opacity-40" style={{ backgroundColor: t.primary }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[#1f1f25]/40 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-3 relative overflow-hidden group hover:bg-white/5 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Lock size={64} />
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-black">
                <Lock size={12} />
                <p className="text-[10px] uppercase tracking-widest">Encryption</p>
              </div>
              <p className="text-2xl font-black text-white tracking-tighter">AES-256-GCM</p>
            </div>
            
            <div className="bg-[#1f1f25]/40 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-3 relative overflow-hidden group hover:bg-white/5 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Cloud size={64} />
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-black">
                <Cloud size={12} />
                <p className="text-[10px] uppercase tracking-widest">E2EE Storage</p>
              </div>
              <p className="text-2xl font-black text-white tracking-tighter">ENABLED</p>
            </div>

            <div className="bg-[#1f1f25]/40 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-3 relative overflow-hidden group hover:bg-white/5 transition-all">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Settings2 size={64} />
                </div>
              <div className="flex items-center gap-2 text-slate-500 font-black">
                <Settings2 size={12} />
                <p className="text-[10px] uppercase tracking-widest">Version</p>
              </div>
              <p className="text-2xl font-black text-white tracking-tighter">RP-2.0.4</p>
            </div>
          </div>

        </section>
      </div>
    </motion.div>
  );
}
