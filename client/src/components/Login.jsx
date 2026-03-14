import { useState } from "react";
import api from "../services/api";
import { connectSocket } from "../services/socket";
import "./login.css";

export default function Login({ onLogin, onSignup }) {
  const [loginMethod, setLoginMethod] = useState("email"); // 'email' or 'phone'
  
  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
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
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone) return setError("Please enter a phone number");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/send-otp", { phone });
      setOtpSent(true);
      setError("OTP Sent Successfully! (Check terminal)");
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
      handleLoginSuccess(res);
    } catch (err) {
      console.error("OTP verify error:", err);
      setError(err.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <h2>RelayChat</h2>

        <div className="login-method-toggle" style={{display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center'}}>
          <button 
            style={{background: loginMethod === 'email' ? '#075e54' : '#ccc', padding: '5px 10px', color: 'white'}}
            onClick={() => { setLoginMethod("email"); setError(""); }}
          >
            Email
          </button>
          <button 
            style={{background: loginMethod === 'phone' ? '#075e54' : '#ccc', padding: '5px 10px', color: 'white'}}
            onClick={() => { setLoginMethod("phone"); setError(""); }}
          >
            Phone OTP
          </button>
        </div>

        {error && (
          <div className="error-message" style={{color: error.includes("Success") ? "green" : "red"}}>
            {error}
          </div>
        )}

        {loginMethod === "email" ? (
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
            <button onClick={handleEmailLogin} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </>
        ) : (
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
               <button onClick={handleSendOtp} disabled={loading}>
                 {loading ? "Sending..." : "Send OTP"}
               </button>
            ) : (
               <button onClick={handleVerifyOtp} disabled={loading}>
                 {loading ? "Verifying..." : "Verify & Login"}
               </button>
            )}
          </>
        )}

        <p className="signup-text">
          Not logged in yet?
          <span onClick={onSignup}> Sign up</span>
        </p>
      </div>
    </div>
  );
}
