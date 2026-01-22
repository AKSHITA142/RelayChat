import  {useState}  from "react";
import Auth from "./pages/Auth";
import Chat from "./pages/chat";

function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));

  return loggedIn ? (
    <Chat />
  ) : (
    <Auth onAuthSuccess={() => setLoggedIn(true)} />
  );
}
export default App;


