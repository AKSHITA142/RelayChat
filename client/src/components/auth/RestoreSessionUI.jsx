import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RestoreSessionUI({
  restoreError,
  isWaitingForApproval,
  syncStatus,
  restorePin,
  setRestorePin,
  loading,
  onRestoreBackup,
  onDeviceVerification,
  onSkipRestore,
  onContinueWithoutHistory,
}) {
  return (
    <div className="space-y-6">
      {restoreError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {restoreError}
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {isWaitingForApproval ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <Card className="relative overflow-hidden border-border/70 bg-card/80 p-8 text-center">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent" />
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
                <div className="absolute h-20 w-20 animate-spin rounded-full border-2 border-secondary/15 border-t-secondary" />
                <Smartphone size={34} className="text-secondary" />
              </div>
              <div className="mt-6 space-y-3">
                <h3 className="font-space text-2xl font-bold text-foreground">Waiting for Approval</h3>
                <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">{syncStatus}</p>
              </div>
              <Button variant="secondary" onClick={onContinueWithoutHistory} className="mt-8 w-full sm:w-auto">
                Log in anyway (No history sync)
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="restore-options"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="grid gap-4 md:grid-cols-2"
          >
            <Card className="group relative flex h-full flex-col gap-5 overflow-hidden border-border/70 bg-card/82 p-6">
              <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/10 blur-3xl transition-colors group-hover:bg-primary/15" />
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Lock size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="font-space text-lg font-bold text-foreground">Cloud Backup</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Restore instantly using the 4-digit PIN created on your previous device.
                </p>
              </div>
              <div className="mt-auto space-y-3">
                <Input
                  icon={Lock}
                  type="password"
                  placeholder="Enter Backup PIN"
                  value={restorePin}
                  onChange={(e) => setRestorePin(e.target.value)}
                  className="text-center tracking-[0.35em]"
                />
                <Button onClick={onRestoreBackup} disabled={loading || restorePin.length < 4} className="w-full">
                  {loading && restorePin ? <Loader2 className="animate-spin" /> : "Restore with PIN"}
                </Button>
              </div>
            </Card>

            <Card className="group relative flex h-full flex-col gap-5 overflow-hidden border-border/70 bg-card/82 p-6">
              <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-secondary/10 blur-3xl transition-colors group-hover:bg-secondary/15" />
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <Smartphone size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="font-space text-lg font-bold text-foreground">Device Approval</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Request sync approval from another trusted device and continue without a PIN.
                </p>
              </div>
              <div className="mt-auto">
                <Button onClick={onDeviceVerification} disabled={loading && !restorePin} variant="secondary" className="w-full">
                  {loading && !restorePin ? <Loader2 className="animate-spin" /> : "Ask Trusted Device"}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onSkipRestore}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Cancel and log back out
      </button>
    </div>
  );
}
