import  {useState, useEffect}  from "react";
import Auth from "./pages/Auth";
import Chat from "./pages/chat";
import { isTokenValid } from "./utils/auth";

function App() {
  const token = localStorage.getItem("token");
  const sessionActive = localStorage.getItem("session-active") === "true";
  const [loggedIn, setLoggedIn] = useState(sessionActive && isTokenValid(token));
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // If a stale/invalid token is present, clear the auto-resume flag and ask the user to log in again.
    if (sessionActive && !isTokenValid(token)) {
      localStorage.removeItem("session-active");
      setSessionExpired(true);
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
    />
  );
}
export default App;


