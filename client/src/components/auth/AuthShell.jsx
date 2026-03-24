import { motion } from "framer-motion";
import { Shield, Sparkles, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const defaultHighlights = [
  {
    icon: Shield,
    title: "Encrypted identity",
    description: "Every sign-in flow stays aligned with device verification and backup recovery.",
  },
  {
    icon: KeyRound,
    title: "Recovery ready",
    description: "Restore sessions, rotate devices, and keep keys available without exposing private data.",
  },
  {
    icon: Sparkles,
    title: "Fast handoff",
    description: "The UI is built for quick mobile entry without sacrificing clarity on desktop.",
  },
];

export default function AuthShell({
  eyebrow = "Secure Access",
  title,
  description,
  children,
  footer,
  wide = false,
  highlights = defaultHighlights,
  className,
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-hero-fade opacity-90" />
      <div className="pointer-events-none absolute left-[-12%] top-[-12%] h-[40rem] w-[40rem] rounded-full bg-primary/18 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-[-14%] right-[-12%] h-[36rem] w-[36rem] rounded-full bg-secondary/16 blur-[150px]" />

      <div className={cn("relative z-10 w-full", wide ? "max-w-6xl" : "max-w-5xl", className)}>
        <div className={cn("grid gap-6", wide ? "lg:grid-cols-[0.9fr,1.1fr]" : "lg:grid-cols-[0.85fr,1fr]")}>
          <motion.aside
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            className="surface-panel hidden min-h-[32rem] flex-col justify-between overflow-hidden p-8 lg:flex"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                {eyebrow}
              </div>

              <div className="space-y-4">
                <p className="font-space text-5xl font-bold tracking-tight text-foreground">RelayChat</p>
                <p className="max-w-md text-sm leading-7 text-muted-foreground">
                  Secure sign-in surfaces for device recovery, password access, and fast OTP verification.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {highlights.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
                <div key={itemTitle} className="rounded-2xl border border-border/60 bg-card/60 p-4">
                  <div className="mb-3 inline-flex rounded-xl border border-secondary/20 bg-secondary/10 p-2 text-secondary">
                    <Icon size={16} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{itemTitle}</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{itemDescription}</p>
                </div>
              ))}
            </div>
          </motion.aside>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/70 bg-card/88 p-6 shadow-glow md:p-8">
              <div className="mb-8 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-secondary">
                  {eyebrow}
                </div>
                <div className="space-y-2">
                  <h1 className="font-space text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {title}
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>

              {children}

              {footer ? <div className="mt-8">{footer}</div> : null}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
