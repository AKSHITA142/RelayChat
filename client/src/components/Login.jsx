import { useState } from "react";
import api from "../services/api";
import { connectSocket } from "../services/socket";
import "./login.css";

export default function Login({ onLogin, onSignup }) {
  const [loginMethod, setLoginMethod] = useState("phone"); // Default to Phone OTP
  
  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
  // Registration Flow state (for new phone users)
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoginSuccess = (res) => {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    connectSocket();
    onLogin();
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return setError("Please enter email and password");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      handleLoginSuccess(res);
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone) return setError("Please enter a phone number");
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/send-otp", { phone });
      setOtpSent(true);
      setError("OTP Sent Successfully! (Check your phone)");
    } catch (err) {
      console.error("OTP send error:", err);
      setError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phone || !otp) return setError("Please enter phone and OTP");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/verify-otp", { phone, otp });
      
      // If backend returns 202, it means it's a new user who needs to register
      if (res.status === 202) {
        setIsRegistering(true);
        setError("Phone verified! Please complete your profile.");
      } else {
        handleLoginSuccess(res);
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      setError(err.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!name) return setError("Name is required");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/complete-registration", {
        name,
        email,
        password,
        phoneNumber: phone
      });
      handleLoginSuccess(res);
    } catch (err) {
      console.error("Registration failed:", err);
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <h2 style={{ marginBottom: '10px' }}>RelayChat</h2>
        <p style={{ fontSize: '0.9rem', marginBottom: '25px', textAlign: 'center' }}>
          {isRegistering ? "Almost there!" : loginMethod === "phone" ? "Verify your phone number" : "Login with your account"}
        </p>

        {error && (
          <div className="error-message" style={{ color: error.includes("Success") || error.includes("verified") ? "green" : "red", fontSize: '0.85rem', marginBottom: '15px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {isRegistering ? (
          <>
            <input
              type="text"
              placeholder="Full Name (Required for WhatsApp style)"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email (Optional)"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Set Password (Optional)"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button onClick={handleCompleteRegistration} disabled={loading} style={{ background: '#075e54', marginTop: '10px' }}>
              {loading ? "Registering..." : "Finish & Get Started"}
            </button>
            <button 
              className="back-btn" 
              style={{ background: 'none', color: '#ffffff', marginTop: '10px', fontSize: '0.9rem' }}
              onClick={() => { setIsRegistering(false); setOtpSent(false); setOtp(""); setError(""); }}
            >
              Cancel
            </button>
          </>
        ) : loginMethod === "phone" ? (
          <>
            <input
              type="text"
              placeholder="Phone Number (+91987...)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={otpSent}
            />
            
            {otpSent && (
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength={6}
              />
            )}

            {!otpSent ? (
               <button onClick={handleSendOtp} disabled={loading} style={{ background: '#075e54' }}>
                 {loading ? "Sending..." : "Send OTP"}
               </button>
            ) : (
               <button onClick={handleVerifyOtp} disabled={loading} style={{ background: '#075e54' }}>
                 {loading ? "Verifying..." : "Verify OTP"}
               </button>
            )}

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <span 
                style={{ color: '#ffffff', cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={() => { setLoginMethod("email"); setError(""); }}
              >
                Log in with Password instead
              </span>
            </div>
          </>
        ) : (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button onClick={handleEmailLogin} disabled={loading} style={{ background: '#075e54', marginTop: '10px' }}>
              {loading ? "Logging in..." : "Login"}
            </button>
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <span 
                style={{ color: '#ffffff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
                onClick={() => { setLoginMethod("phone"); setError(""); }}
              >
                ← Back to Phone Login
              </span>
            </div>
          </>
        )}

        {!isRegistering && (
          <p className="signup-text">
            Not logged in yet?
            <span onClick={onSignup}>Sign up</span>
          </p>
        )}
      </div>
    </div>
  );
}

