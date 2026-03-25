import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, Lock, User, ArrowRight, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import AuthCard3D, { AuthInput3D, AuthButton3D } from "@/components/ui/3d-auth-card";

export default function EnhancedLogin({ onLogin, loading }) {
  const [loginMethod, setLoginMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+91");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
    onLogin({ email, password, phone, method: loginMethod });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AuthCard3D className="p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Enter your credentials to access your secure workspace</p>
        </motion.div>

        {/* Method Selector */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex rounded-2xl border border-white/10 bg-white/6 p-1 backdrop-blur-sm">
            {[
              { id: "email", label: "Email", icon: Mail },
              { id: "phone", label: "Phone", icon: Phone },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setLoginMethod(id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300",
                  loginMethod === id
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {loginMethod === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <AuthInput3D
                  label="Email address"
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
                
                <AuthInput3D
                  label="Password"
                  icon={Lock}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full"
                />
              </motion.div>
            ) : (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <AuthInput3D
                  label="Phone number"
                  icon={Phone}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full"
                />
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    We'll send you a verification code
                  </p>
                  <AuthButton3D type="button" className="w-full">
                    Send OTP
                    <ArrowRight size={16} className="ml-2" />
                  </AuthButton3D>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loginMethod === "email" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AuthButton3D type="submit" loading={loading} className="w-full">
                Sign In
                <ArrowRight size={16} className="ml-2" />
              </AuthButton3D>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </form>

        {/* Security Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <Shield size={12} />
          <span>End-to-end encrypted • Secure authentication</span>
        </motion.div>
      </AuthCard3D>
    </div>
  );
}
