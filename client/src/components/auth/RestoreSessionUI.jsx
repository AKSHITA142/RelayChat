import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";
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
        <div className="surface-inline rounded-[22px] border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
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
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Card className="relative overflow-hidden p-8 text-center">
              <div className="pointer-events-none absolute inset-0 bg-aurora opacity-70" />
              <div className="relative z-10">
                <div className="mx-auto flex size-24 items-center justify-center rounded-full border border-secondary/20 bg-secondary/12">
                  <div className="absolute size-24 animate-spin rounded-full border-2 border-secondary/15 border-t-secondary" />
                  <Smartphone size={36} className="text-secondary" />
                </div>
                <div className="mt-6 space-y-3">
                  <p className="section-badge justify-center">
                    <ShieldCheck size={12} />
                    Trusted device check
                  </p>
                  <h3 className="font-headline text-3xl font-bold tracking-tight text-foreground">Waiting for approval</h3>
                  <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">{syncStatus}</p>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-secondary animate-pulse">
                  <ShieldCheck size={16} />
                  Awaiting security confirmation...
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="restore-options"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="grid gap-4 lg:grid-cols-2"
          >
            <Card className="group flex h-full flex-col gap-5 p-6">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12 text-primary">
                <Lock size={26} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Cloud recovery</p>
                <h3 className="font-headline text-xl font-bold tracking-tight text-foreground">Restore with backup PIN</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Use the PIN you created on a trusted device to restore your encrypted identity immediately.
                </p>
              </div>
              <div className="mt-auto space-y-3">
                <Input
                  icon={Lock}
                  type="password"
                  placeholder="Enter backup PIN"
                  value={restorePin}
                  onChange={(event) => setRestorePin(event.target.value)}
                  className="text-center tracking-[0.35em]"
                />
                <Button onClick={onRestoreBackup} disabled={loading || restorePin.length < 4} className="w-full">
                  {loading && restorePin ? <Loader2 className="animate-spin" /> : "Restore with PIN"}
                </Button>
              </div>
            </Card>

            <Card className="group flex h-full flex-col gap-5 p-6">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/12 text-secondary">
                <Smartphone size={26} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-secondary">Device approval</p>
                <h3 className="font-headline text-xl font-bold tracking-tight text-foreground">Ask another trusted device</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Send an approval request to another active device and continue without typing the recovery PIN.
                </p>
              </div>
              <div className="mt-auto">
                <Button onClick={onDeviceVerification} disabled={loading && !restorePin} variant="secondary" className="w-full">
                  {loading && !restorePin ? <Loader2 className="animate-spin" /> : "Request device approval"}
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
