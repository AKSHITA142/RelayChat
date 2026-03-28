import  {useState, useEffect}  from "react";
import { AnimatePresence, motion } from "framer-motion";
import Auth from "./pages/Auth";
import Chat from "./pages/chat";
import { clearClientStorage, isTokenValid } from "./utils/auth";
import { redirectToSessionExpired, replaceUrlToAppBase } from "./utils/navigation";

import socket from "./services/socket";

function App() {
  const token = localStorage.getItem("token");
  const sessionActive = localStorage.getItem("session-active") === "true";
  const [loggedIn, setLoggedIn] = useState(sessionActive && isTokenValid(token));
  const [sessionExpired, setSessionExpired] = useState(() => {
    const isExpired = window.location.search.includes("session_expired=true");
    if (isExpired) {
      clearClientStorage();
      
      // Clean the URL so the message doesn't persist on manual reload
      replaceUrlToAppBase();
    }
    return isExpired;
  });

  useEffect(() => {
    socket.on("session-expired", ({ reason }) => {
      console.warn("Session expired:", reason);
      clearClientStorage();
      
      redirectToSessionExpired();
    });

    return () => {
      socket.off("session-expired");
    };
  }, []);

  useEffect(() => {
    // If a stale/invalid token is present, clear the auto-resume flag and ask the user to log in again.
    if (sessionActive && (!token || !isTokenValid(token))) {
      clearClientStorage();
      redirectToSessionExpired();
    }

    // Auto-resume if a valid token exists and session-active was left on
    if (!loggedIn && sessionActive && isTokenValid(token)) {
      setLoggedIn(true);
    }
  }, [loggedIn, sessionActive, token]);

  return (
    <AnimatePresence mode="wait">
      {loggedIn ? (
        <motion.div
          key="chat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 h-screen w-screen overflow-hidden"
        >
          <Chat />
        </motion.div>
      ) : (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Auth
            onAuthSuccess={() => setLoggedIn(true)}
            sessionExpired={sessionExpired}
            onDismissExpiry={() => setSessionExpired(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default App;


