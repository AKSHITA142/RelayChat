import { useState } from "react";
import Login from "../components/Login";
import Register from "../components/Register";

export default function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // login | register//My default login if tocken is not there

  return mode === "login" ? (
    <Login
      onLogin={onAuthSuccess}
      onSignup={() => setMode("register")}
    />
  ) : (
    <Register
      onRegister={() => setMode("login")}
      onBackToLogin={() => setMode("login")}
    />
  );
}
