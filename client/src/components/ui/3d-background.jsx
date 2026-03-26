import { cn } from "@/lib/utils";

export default function Background3D({ className }) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-slate-900/20" />
    </div>
  );
}
