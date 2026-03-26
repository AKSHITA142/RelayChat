import { motion } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const BeautifulInput = forwardRef(({ 
  icon: Icon, 
  placeholder, 
  value, 
  onChange, 
  type = "text",
  className = "",
  variant = "default",
  ...props 
}, ref) => {
  const placeholderStyles = {
    "Full name": "Start typing your real name...",
    "Email address": "your.email@example.com",
    "Create password": "Create a strong password...",
    "6-digit OTP": "Enter the 6-digit code",
    "Phone (+91...)": "Enter your 10-digit number",
    "Collective Name": "Name your group chat...",
    "Search conversations...": "Find your conversations...",
    "Phone (+91987...)": "Enter phone number...",
    "Write a message...": "Type your message here...",
    "Status broadcast...": "What's on your mind?",
    "Your identity name...": "How should we call you?",
    "Current security PIN": "Enter your current PIN...",
    "Enter backup PIN": "Enter your backup PIN...",
    "Search in chat...": "Search messages...",
    "Email (optional)": "your.email@example.com (optional)",
    "Password (optional)": "Add an extra layer of security...",
    "Enter 10-digit number": "Your 10-digit mobile number",
    "6-digit security code": "Enter the code we sent you..."
  };

  const getBeautifulPlaceholder = (text) => {
    return placeholderStyles[text] || text;
  };

  const variantStyles = {
    default: "bg-gradient-to-r from-white/10 to-white/5 border-white/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
    primary: "bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/30",
    glass: "bg-gradient-to-br from-white/5 to-white/10 border-white/20 backdrop-blur-md focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("relative group", className)}
    >
      {Icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <Icon 
            size={18} 
            className="text-muted-foreground/70 group-focus-within:text-primary transition-colors duration-300" 
          />
        </div>
      )}
      
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={getBeautifulPlaceholder(placeholder)}
        className={cn(
          "w-full rounded-2xl border px-12 py-4 text-foreground placeholder:text-muted-foreground/60",
          "bg-gradient-to-r from-white/8 to-white/4 backdrop-blur-sm",
          "border-white/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
          "transition-all duration-300 ease-out",
          "placeholder:italic",
          "outline-none",
          "shadow-sm focus:shadow-lg focus:shadow-primary/20",
          Icon && "pl-12",
          variantStyles[variant]
        )}
        {...props}
      />
      
      {/* Animated underline effect */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 to-secondary/60 rounded-full"
        initial={{ scaleX: 0 }}
        whileFocus={{ scaleX: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </motion.div>
  );
});

BeautifulInput.displayName = "BeautifulInput";

export default BeautifulInput;
