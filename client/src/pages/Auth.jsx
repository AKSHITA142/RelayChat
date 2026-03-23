import { useState } from "react";
import Login from "../components/Login";
import Register from "../components/Register";
import { isTokenValid } from "../utils/auth";

export default function Auth({ onAuthSuccess, sessionExpired = false, onDismissExpiry }) {
  const [mode, setMode] = useState("login"); // login | register//My default login if tocken is not there
  const token = localStorage.getItem("token");
  const canResume = isTokenValid(token);

  return mode === "login" ? (
    <Login
      onLogin={onAuthSuccess}
      canResume={canResume}
      sessionExpired={sessionExpired}
      onAction={onDismissExpiry}
      onSignup={() => setMode("register")}
    />
  ) : (
    <Register
      onRegister={() => setMode("login")}
      onBackToLogin={() => setMode("login")}
    />
  );
}
