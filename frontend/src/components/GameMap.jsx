import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import io from "socket.io-client";
import "leaflet/dist/leaflet.css";
import characterIcon from "../assets/hey.gif";
import { motion, AnimatePresence } from "framer-motion";
import backgroundImage from "../assets/background.jpg";

const socket = io(import.meta.env.VITE_SOCKET_URL);

const GameMap = () => {
  const [users, setUsers] = useState({});
  const [position, setPosition] = useState({ lat: 51.505, lng: -0.09 });
  const [nearbyUser, setNearbyUser] = useState(null);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const playerIcon = L.icon({
    iconUrl: characterIcon,
    iconSize: [100, 100],
    iconAnchor: [30, 60],
    popupAnchor: [0, -50],
    className: "custom-icon",
  });

  const handleEndChat = () => {
    if (nearbyUser) {
      socket.emit("endChat", { to: nearbyUser.userId });
      setNearbyUser(null);
      setChatLog([]);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    socket.emit("login", { username });

    socket.on("updateUsers", (data) => setUsers(data));

    socket.on("canChatWith", ({ userId, username }) => {
      setNearbyUser({ userId, username });
    });

    socket.on("chatMessage", (data) => {
      // Expecting data to have: { fromUsername, message }
      setChatLog((prev) => [...prev, data]);
    });

    socket.on("chatEnded", () => {
      alert("Chat ended by the other user.");
      setNearbyUser(null);
      setChatLog([]);
    });

    return () => {
      socket.off("updateUsers");
      socket.off("canChatWith");
      socket.off("chatMessage");
      socket.off("chatEnded");
    };
  }, [isLoggedIn, username]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Prevent movement during active chat
      if (nearbyUser) return;

      let newPos = { ...position };
      if (e.key === "w") newPos.lat += 0.0005;
      if (e.key === "s") newPos.lat -= 0.0005;
      if (e.key === "a") newPos.lng -= 0.0005;
      if (e.key === "d") newPos.lng += 0.0005;

      setPosition(newPos);
      socket.emit("move", newPos);
    };

    if (isLoggedIn) {
      window.addEventListener("keydown", handleKeyPress);
    }

    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [position, isLoggedIn, nearbyUser]); // Make sure nearbyUser is in the dependency array

  if (!isLoggedIn) {
    return (
      <div
        style={{
          ...styles.usernameContainer,
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        <div style={styles.overlay} />
        <div style={styles.snakeBorder}>
          <div style={styles.formContent}>
            <h2>Enter your name to join:</h2>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.usernameInput}
              placeholder="Your name"
            />
            <button
              onClick={() => {
                if (username.trim()) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const { latitude, longitude } = pos.coords;
                      setPosition({ lat: latitude, lng: longitude });
                      setIsLoggedIn(true);
                      socket.emit("move", { lat: latitude, lng: longitude }); // Send to server
                    },
                    (err) => {
                      alert("Location access is required to join the game.");
                      console.error(err);
                    }
                  );
                }
              }}
              style={styles.joinButton}
            >
              Join Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <MapContainer center={position} zoom={13} style={{ height: "100vh" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {Object.values(users).map((user) => (
          <Marker key={user.id} position={user.position} icon={playerIcon}>
            <Popup>{user.username}</Popup>
          </Marker>
        ))}
      </MapContainer>

      <AnimatePresence>
        {nearbyUser && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
            style={styles.chatBox}
          >
            <div style={styles.chatHeader}>
              <h4>Chat with {nearbyUser.username}</h4>
              <button onClick={handleEndChat} style={styles.endButton}>
                End
              </button>
            </div>
            <div style={styles.chatLog}>
              {chatLog.map((msg, i) => (
                <div key={i}>
                  <strong>
                    {msg.fromUsername === username ? "You" : msg.fromUsername}:
                  </strong>{" "}
                  {msg.message}
                </div>
              ))}
            </div>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message"
              style={styles.chatInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && message.trim()) {
                  socket.emit("chat", {
                    to: nearbyUser.userId,
                    message,
                    fromUsername: username,
                  });
                  setChatLog((prev) => [
                    ...prev,
                    { fromUsername: username, message },
                  ]);
                  setMessage("");
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const styles = {
  usernameContainer: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Dimmed overlay
    zIndex: 1,
  },
  formContent: {
    position: "relative",
    zIndex: 2,
    textAlign: "center",
    color: "#fff",
  },
  usernameInput: {
    padding: "10px",
    fontSize: "16px",
    marginTop: "10px",
    borderRadius: "5px",
    border: "none",
    width: "250px",
  },
  snakeBorder: {
    position: "relative",
    padding: "3px",
    borderRadius: "12px",
    background: "linear-gradient(270deg, #00ffff, #ff00ff, #00ffff)",
    backgroundSize: "600% 600%",
    animation: "snakeMove 4s linear infinite",
    zIndex: 2,
  },

  joinButton: {
    marginTop: "10px",
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#61dafb",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  chatBox: {
    position: "absolute",
    bottom: 20,
    left: 20,
    background: "#fff",
    padding: 10,
    borderRadius: 10,
    width: 300,
    boxShadow: "0 0 10px rgba(0,0,0,0.3)",
    zIndex: 1000,
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
  },
  endButton: {
    background: "crimson",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    padding: "2px 6px",
    cursor: "pointer",
  },
  chatLog: {
    maxHeight: 150,
    overflowY: "auto",
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    padding: 5,
    borderRadius: 5,
  },
  chatInput: {
    width: "100%",
    padding: "6px",
    borderRadius: 5,
    border: "1px solid #ccc",
  },
};
<style>
  {`
    @keyframes snakeMove {
      0% {
        background-position: 0% 50%;
      }
      100% {
        background-position: 100% 50%;
      }
    }
  `}
</style>;

export default GameMap;
