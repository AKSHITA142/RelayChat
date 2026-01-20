import { useState } from "react";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
function App() {
  //!!->this is used to convert into bollean value of what is coming result for token
    const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));
    const [activeChat, setActiveChat] = useState(null);

    if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

    return (
      <div style={{ display: "flex", height: "100vh" }}>
        <Sidebar setActiveChat={setActiveChat} />
        <ChatWindow chat={activeChat} />
      </div>
    );
}

export default App
