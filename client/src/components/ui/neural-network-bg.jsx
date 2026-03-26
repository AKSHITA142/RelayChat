import { cn } from "@/lib/utils";

export default function NeuralNetworkBackground({ className }) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
    </div>
  );
}
