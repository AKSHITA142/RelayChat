import { useState } from "react";
import api from "../services/api";
import "./register.css";

export default function Register({ onRegister, onBackToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    try {
      await api.post("/auth/register", { name, email, password });
      onRegister();
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "Registration failed. Try again.");
    }
  };

  return (
    <div className="register-bg">
      <div className="register-card">
        <h2>Create Account</h2>

        {error && <div className="error-message">{error}</div>}

        <input placeholder="Name" onChange={e => setName(e.target.value)} />
        <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input
          type="password"
          placeholder="Password"
          onChange={e => setPassword(e.target.value)}
        />

        <button onClick={handleRegister}>Register</button>

        <p className="login-text">
          Already have an account?
          <span onClick={onBackToLogin}> Login</span>
        </p>
      </div>
    </div>
  );
}
