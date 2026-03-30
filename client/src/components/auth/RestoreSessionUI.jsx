import { Loader2, Lock, ShieldCheck, Smartphone, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RestoreSessionUI({
  restoreError,
  isWaitingForApproval,
  syncStatus,
  restorePin,
  setRestorePin,
  loading,
  onRestoreBackup,
  onDeviceVerification,
  onGoToPIN,
  onSkipRestore,
  onContinueWithoutHistory,
}) {
  return (
    <div className="space-y-6">
      {restoreError && (
        <div 
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <XCircle size={20} className="shrink-0" />
          {restoreError}
        </div>
      )}

      {isWaitingForApproval ? (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-secondary/30 bg-black/50 p-8 text-center backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent" />
            <div className="relative z-10">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                <div className="absolute h-24 w-24 animate-spin rounded-full border-2 border-secondary/20 border-t-secondary" />
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                  <Smartphone size={32} className="text-secondary" />
                </div>
              </div>
              
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-center gap-2 text-secondary">
                  <ShieldCheck size={16} />
                  <span className="text-xs font-medium uppercase tracking-wider">Security Check</span>
                </div>
                <h3 className="text-2xl font-bold text-white">Waiting for Approval</h3>
              </div>
              
              <p className="mx-auto max-w-sm text-sm text-white/60">
                {syncStatus || "Request sent to your trusted device. Please approve on that device."}
              </p>
              
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-secondary animate-pulse">
                <div className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                Awaiting confirmation...
              </div>
            </div>
          </div>

          <Button
            onClick={onGoToPIN}
            variant="outline"
            className="w-full rounded-xl"
          >
            <ArrowLeft size={16} className="mr-2" />
            Use PIN instead
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-black/50 p-6 backdrop-blur-md transition-all hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <div className="relative z-10">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20">
                  <Lock size={26} className="text-primary" />
                </div>
                <div className="mb-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">Option 1</p>
                  <h3 className="text-lg font-bold text-white">Restore with PIN</h3>
                  <p className="mt-2 text-sm text-white/60">
                    Enter the backup PIN you created on another device.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Enter backup PIN"
                      value={restorePin}
                      onChange={(e) => setRestorePin(e.target.value)}
                      maxLength={8}
                      className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-12 text-center text-lg tracking-[0.3em] text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      aria-label="Backup PIN"
                    />
                  </div>
                  {restorePin && (
                    <div className="flex gap-1.5" role="progressbar" aria-valuenow={restorePin.length} aria-valuemin={0} aria-valuemax={8}>
                      {[...Array(Math.min(restorePin.length, 8))].map((_, i) => (
                        <div key={i} className="h-1.5 flex-1 rounded-full bg-primary" />
                      ))}
                    </div>
                  )}
                  <Button
                    onClick={onRestoreBackup}
                    disabled={loading || restorePin.length < 4}
                    className="w-full rounded-xl"
                  >
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Restoring... </> : "Restore with PIN"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-secondary/30 bg-black/50 p-6 backdrop-blur-md transition-all hover:border-secondary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent" />
              <div className="relative z-10">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-secondary/30 bg-secondary/20">
                  <Smartphone size={26} className="text-secondary" />
                </div>
                <div className="mb-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-secondary">Option 2</p>
                  <h3 className="text-lg font-bold text-white">Request Approval</h3>
                  <p className="mt-2 text-sm text-white/60">
                    Send a request to your trusted device for quick approval.
                  </p>
                </div>
                <Button
                  onClick={onDeviceVerification}
                  disabled={loading}
                  variant="secondary"
                  className="w-full rounded-xl"
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending... </> : "Request Approval"}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-md">
            <h4 className="flex items-center gap-2 text-base font-semibold text-white">
              <CheckCircle size={18} className="text-white" />
              New to RelayChat?
            </h4>
            <p className="mb-4 mt-2 text-sm text-white/60">
              If this is your first time, you don't need a backup PIN or device verification. You can jump right in.
            </p>
            <Button
              onClick={onContinueWithoutHistory}
              className="w-full rounded-xl bg-white text-black hover:bg-white/90 font-semibold"
            >
              Join Chat Directly
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row mt-4">
            <button
              type="button"
              onClick={onContinueWithoutHistory}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
            >
              Continue without history
            </button>
            <button
              type="button"
              onClick={onSkipRestore}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/50 transition-all hover:bg-white/10 hover:text-white/70"
            >
              <XCircle size={18} />
              Go back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
