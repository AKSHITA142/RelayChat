import { motion } from "framer-motion";
import { KeyRound, Shield, Sparkles, Workflow } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Advanced3DBackground from "@/components/ui/advanced-3d-bg";

const defaultHighlights = [
  {
    icon: Shield,
    title: "Encrypted identity",
    description: "Every sign-in surface stays aligned with device verification and private key recovery.",
  },
  {
    icon: KeyRound,
    title: "Recovery ready",
    description: "Restore sessions, rotate devices, and keep your message history accessible without exposing secrets.",
  },
  {
    icon: Sparkles,
    title: "Fast handoff",
    description: "Phone-first on mobile, premium and spacious on desktop, with the same protected flow underneath.",
  },
];

const platformStats = [
  { label: "Security", value: "E2EE First" },
  { label: "Restore", value: "PIN + Device" },
  { label: "Access", value: "OTP / Email" },
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-foreground">
      <Advanced3DBackground className="absolute inset-0 z-0" />
      
      <div className="pointer-events-none absolute inset-0 bg-hero-fade opacity-60" />
      <div className="pointer-events-none absolute inset-0 app-noise opacity-30" />

      <div className={cn("relative z-10 w-full", wide ? "max-w-6xl" : "max-w-5xl", className)}>
        <div className={cn("grid gap-6", wide ? "lg:grid-cols-[0.92fr,1.08fr]" : "lg:grid-cols-[0.88fr,1fr]")}>
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="surface-panel hidden min-h-[38rem] flex-col justify-between overflow-hidden p-8 lg:flex lg:p-10 backdrop-blur-2xl border-l border-white/10"
          >
            <div className="space-y-7">
              <div className="section-badge">
                <Workflow size={12} />
                {eyebrow}
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/40 to-secondary/40 p-1 shadow-lg">
                    <img 
                      src="/logo.png" 
                      alt="RelayChat" 
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-headline text-3xl font-bold tracking-tight text-gradient">RelayChat</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Private messaging workspace</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="font-headline text-5xl font-bold tracking-[-0.04em] text-gradient">
                    Secure access designed like a premium product.
                  </h2>
                  <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                    The entry flow balances device trust, encrypted backup recovery, and fast authentication in a calm,
                    high-clarity workspace.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {platformStats.map((item) => (
                  <div key={item.label} className="surface-panel rounded-[22px] px-4 py-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-panel">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-gradient">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {highlights.map(({ icon: Icon, title: itemTitle, description: itemDescription }, index) => (
                <motion.div
                  key={itemTitle}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * index, duration: 0.45, ease: "easeOut" }}
                  whileHover={{ scale: 1.02 }}
                  className="surface-panel rounded-[24px] p-4 transition-all duration-300 hover:shadow-panel cursor-pointer"
                >
                  <div className="mb-3 inline-flex rounded-2xl border border-secondary/20 bg-secondary/12 p-2.5 text-secondary shadow-sm hover:shadow-md transition-all duration-300">
                    <Icon size={16} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{itemTitle}</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{itemDescription}</p>
                </motion.div>
              ))}
            </div>
          </motion.aside>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
            <Card className="surface-panel overflow-hidden p-6 md:p-8 lg:p-10 backdrop-blur-2xl border-l border-white/10 shadow-panel">
              <div className="mb-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/40 to-secondary/40 p-0.5 shadow-md">
                      <img 
                        src="/logo.png" 
                        alt="RelayChat" 
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="section-badge shadow-lg">
                      <Sparkles size={12} />
                      {eyebrow}
                    </div>
                  </div>
                  <div className="feature-pill shadow-md hover:shadow-lg transition-all duration-300">
                    <span className="inline-flex size-2 rounded-full bg-secondary shadow-[0_0_12px_hsl(var(--secondary)/0.8)] animate-pulse" />
                    Protected workspace
                  </div>
                </div>

                <div className="space-y-3">
                  <h1 className="font-headline text-3xl font-bold tracking-[-0.04em] text-gradient md:text-4xl">
                    {title}
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
                </div>
              </div>

              {children}

              {footer ? <div className="mt-8 border-t border-white/10 pt-6">{footer}</div> : null}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
