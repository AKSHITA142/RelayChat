import  {useState, useEffect}  from "react";
import Auth from "./pages/Auth";
import Chat from "./pages/chat";
import { isTokenValid } from "./utils/auth";

import socket from "./services/socket";

function App() {
  const token = localStorage.getItem("token");
  const sessionActive = localStorage.getItem("session-active") === "true";
  const [loggedIn, setLoggedIn] = useState(sessionActive && isTokenValid(token));
  const [sessionExpired, setSessionExpired] = useState(() => {
    const isExpired = window.location.search.includes("session_expired=true");
    if (isExpired) {
      localStorage.removeItem("token");
      localStorage.removeItem("session-active");
      
      // Clean the URL so the message doesn't persist on manual reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return isExpired;
  });

  useEffect(() => {
    socket.on("session-expired", ({ reason }) => {
      console.warn("Session expired:", reason);
      localStorage.removeItem("token");
      localStorage.removeItem("session-active");
      
      // Redirect to login page with query param
      window.location.href = "/login?session_expired=true";
    });

    return () => {
      socket.off("session-expired");
    };
  }, []);

  useEffect(() => {
    // If a stale/invalid token is present, clear the auto-resume flag and ask the user to log in again.
    if (sessionActive && (!token || !isTokenValid(token))) {
      localStorage.removeItem("session-active");
      localStorage.removeItem("token");
      window.location.href = "/login?session_expired=true";
    }

    // Auto-resume if a valid token exists and session-active was left on
    if (!loggedIn && sessionActive && isTokenValid(token)) {
      setLoggedIn(true);
    }
  }, [loggedIn, sessionActive, token]);

  return loggedIn ? (
    <Chat />
  ) : (
    <Auth
      onAuthSuccess={() => setLoggedIn(true)}
      sessionExpired={sessionExpired}
      onDismissExpiry={() => setSessionExpired(false)}
    />
  );
}
export default App;


