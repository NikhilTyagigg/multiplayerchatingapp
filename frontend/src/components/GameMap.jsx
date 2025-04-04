import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import io from "socket.io-client";
import "leaflet/dist/leaflet.css";
import characterIcon from "../assets/hey.gif";

const socket = io("https://multiplayerchatingapp-1.onrender.com");

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
  }, [position, isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div style={styles.usernameContainer}>
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
              setIsLoggedIn(true);
            }
          }}
          style={styles.joinButton}
        >
          Join Game
        </button>
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

      {nearbyUser && (
        <div style={styles.chatBox}>
          <div style={styles.chatHeader}>
            <h4>Chat with {nearbyUser.username}</h4>
            <button onClick={handleEndChat} style={styles.endButton}>
              End
            </button>
          </div>
          <div style={styles.chatLog}>
            {chatLog.map((msg, i) => (
              <div key={i}>
                <strong>{msg.from === socket.id ? "You" : msg.from}:</strong>{" "}
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
                socket.emit("chat", { to: nearbyUser.userId, message });
                setChatLog((prev) => [...prev, { from: socket.id, message }]);
                setMessage("");
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

const styles = {
  usernameContainer: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#282c34",
    color: "#fff",
  },
  usernameInput: {
    padding: "10px",
    fontSize: "16px",
    marginTop: "10px",
    borderRadius: "5px",
    border: "none",
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

export default GameMap;
