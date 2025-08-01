import React, { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Room from "./components/Room";
import Login from "./components/Login";
import AuthCallback from "./components/AuthCallback";
import RoomHistory from "./components/RoomHistory";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import socket from "./socket";

function App() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white">
        {!isConnected && (
          <div className="bg-red-500 text-white p-2 text-center">
            Disconnected from server
          </div>
        )}
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:roomId" element={<Room />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/history" element={<RoomHistory />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
