import { useState } from "react";
import api from "../services/api";
import "./register.css";

export default function Register({ onRegister, onBackToLogin }) {
  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStartRegistration = async () => {
    if (!name || !email || !password || !phone) {
      return setError("All fields are required");
    }
    setLoading(true);
    setError("");
    try {
      // Step 1: Send OTP to the provided phone number
      await api.post("/auth/send-otp", { phone });
      setStep(2);
    } catch (err) {
      console.error("OTP Error:", err);
      setError(err.response?.data?.message || "Failed to send OTP. Check phone format.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!otp) return setError("Please enter the OTP");
    setLoading(true);
    setError("");
    try {
      // Step 2: Verify OTP and Create User
      // First verify the OTP
      await api.post("/auth/verify-otp", { phone, otp });
      
      // If verification is successful, complete the registration
      const res = await api.post("/auth/complete-registration", {
        name,
        email,
        password,
        phoneNumber: phone
      });
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onRegister(); // Successfully registered and logged in
    } catch (err) {
      console.error("Registration Finalization Error:", err);
      setError(err.response?.data?.message || "Verification or Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-bg">
      <div className="register-card">
        <h2>{step === 1 ? "Create Account" : "Verify Phone"}</h2>
        <p style={{ fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
          {step === 1 
            ? "We will send an OTP to your phone to verify your number." 
            : `Enter the code we sent to ${phone}`}
        </p>

        {error && <div className="error-message" style={{ color: 'red', fontSize: '0.85rem', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}

        {step === 1 ? (
          <>
            <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <input 
              placeholder="Phone Number (+91987...)" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
            />

            <button onClick={handleStartRegistration} disabled={loading} style={{ background: '#075e54' }}>
              {loading ? "Sending OTP..." : "Register"}
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
            />
            <button onClick={handleCompleteRegistration} disabled={loading} style={{ background: '#075e54' }}>
              {loading ? "Completing..." : "Verify & Sign Up"}
            </button>
            <button 
              style={{ background: 'none', color: '#ffffff', marginTop: '10px' }}
              onClick={() => setStep(1)}
            >
              Go Back
            </button>
          </>
        )}

        <p className="login-text" style={{ marginTop: '20px' }}>
          Already have an account?
          <span onClick={onBackToLogin}> Login</span>
        </p>
      </div>
    </div>
  );
}

