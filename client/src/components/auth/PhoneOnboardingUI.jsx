import { useState } from "react";
import { Loader2, Phone, ArrowRight, KeyRound, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthShell from "@/components/auth/AuthShell";
import api from "../../services/api";
import { backupPrivateKeyToCloud } from "../../services/e2ee";

export default function PhoneOnboardingUI({ user, onComplete }) {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [generatedPin, setGeneratedPin] = useState("");
  const [copied, setCopied] = useState(false);
  const [updatedUserData, setUpdatedUserData] = useState(null);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 5) {
      setError("Please enter a valid phone number");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const formattedPhone = phone.trim();
      const res = await api.put("/user/profile", { phoneNumber: formattedPhone });
      setUpdatedUserData(res.data.user);

      // Generate a truly random 6-digit string
      const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedPin(randomPin);

      // Backup the private key locally generated in Login.jsx step
      await backupPrivateKeyToCloud(api, user._id, randomPin);

      setStep("pin");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to save phone number. It may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(generatedPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === "pin") {
    return (
      <AuthShell
        eyebrow="Security Setup"
        title="Your Recovery PIN"
        description="We've securely backed up your chat keys. Please save this auto-generated PIN to restore your messages on other devices."
      >
        <div className="mt-4 space-y-6">
          <div className="group relative overflow-hidden rounded-2xl border border-secondary/30 bg-black/50 p-6 backdrop-blur-md transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent" />
            <div className="relative z-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-secondary/30 bg-secondary/20 shadow-lg">
                <KeyRound size={26} className="text-secondary" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">Auto-Generated PIN</h3>
              
              <div className="my-8 flex justify-center">
                <div className="relative flex items-center justify-center rounded-xl border border-secondary/50 bg-secondary/10 px-6 sm:px-8 py-4 shadow-[0_0_20px_hsl(var(--secondary)/0.15)]">
                  <span className="font-mono text-3xl sm:text-4xl font-bold tracking-[0.25em] text-white">
                    {generatedPin}
                  </span>
                  <button 
                    onClick={handleCopyPin}
                    className="absolute -right-3 -top-3 rounded-full bg-secondary p-2.5 text-secondary-foreground shadow-lg transition-all hover:scale-105 active:scale-95"
                    title="Copy PIN"
                    type="button"
                  >
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left">
                <p className="text-sm leading-relaxed text-white/80">
                  <strong className="text-white">Important:</strong> You can change this PIN to something memorable later in your Settings inside the app. Right now, please make sure you copy it.
                </p>
              </div>

              <Button
                onClick={() => onComplete(updatedUserData)}
                className="mt-6 w-full rounded-xl"
              >
                I've Saved It, Let's Chat <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Complete Profile"
      title="Welcome to RelayChat"
      description="Enter your phone number so your friends can easily find and connect with you inside the app."
    >
      <form onSubmit={handlePhoneSubmit} className="mt-4 space-y-6">
        <div className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-black/50 p-6 backdrop-blur-md transition-all focus-within:border-primary/50 hover:border-primary/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20">
              <Phone size={26} className="text-primary" />
            </div>
            <h3 className="mb-4 text-lg font-bold text-white">Your Phone Number</h3>

            <div className="relative">
              <input
                type="tel"
                placeholder="+1 234 567 8900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-lg tracking-widest text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={loading || !phone}
              className="mt-6 w-full rounded-xl"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </> : <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      </form>
    </AuthShell>
  );
}
