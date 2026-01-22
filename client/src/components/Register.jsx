import { useState } from "react";
import api from "../services/api";
import "./register.css";

export default function Register({ onRegister, onBackToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    await api.post("/auth/register", { name, email, password });
    onRegister();
  };

  return (
    <div className="register-bg">
      <div className="register-card">
        <h2>Create Account</h2>

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
