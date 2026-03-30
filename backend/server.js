const { createServer } = require("node:http");
const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");

const PORT = 3001;

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// ── API ROUTE (for integration testing) ───────────────────────────────
app.post("/create-room", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 4) {
    return res.status(400).send("Invalid");
  }

  res.status(200).send("Room created");
});

// ── HTTP + SOCKET SETUP ───────────────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 50 * 1024 * 1024,
});

// ── In-memory session store ───────────────────────────────────────────
const sessions = new Map();

// ── Health check ──────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", activeSessions: sessions.size }),
);

app.get("/", (_req, res) => {
  res.send("Ephemeral Comms backend is running");
});

// ── SOCKET.IO LOGIC ───────────────────────────────────────────────────
io.on("connection", (socket) => {
  let currentSessionId = null;
  let currentUsername = null;

  socket.on("join-session", ({ sessionId, username, password, avatar }) => {
    if (!sessionId || !username || !password) {
      socket.emit("join-error", {
        message: "Missing session ID, username, or password.",
      });
      return;
    }

    const sid = sessionId.toUpperCase().trim();

    if (sessions.has(sid)) {
      const session = sessions.get(sid);

      if (session.password !== password) {
        socket.emit("join-error", {
          message: "Wrong password for this session.",
        });
        return;
      }

      session.users.set(socket.id, { id: socket.id, username, avatar });
    } else {
      sessions.set(sid, {
        password,
        users: new Map([[socket.id, { id: socket.id, username, avatar }]]),
      });
    }

    currentSessionId = sid;
    currentUsername = username;

    socket.join(sid);

    const users = Array.from(sessions.get(sid).users.values());

    socket.emit("session-joined", { users });
    socket.to(sid).emit("user-joined", {
      userId: socket.id,
      username,
      users,
    });

    console.log(`[+] ${username} (${socket.id}) joined ${sid}`);
  });

  socket.on("message", ({ sessionId, sender, content, avatar, timestamp }) => {
    if (!sessionId || !sessions.has(sessionId)) return;

    const msg = {
      id: "msg-" + Date.now(),
      sender,
      content,
      avatar,
      timestamp,
    };

    socket.to(sessionId).emit("message", { ...msg, isYou: false });
    socket.emit("message", { ...msg, isYou: true });
  });

  socket.on("typing", ({ sessionId, username: who, isTyping }) => {
    if (!sessionId) return;
    socket.to(sessionId).emit("typing", { username: who, isTyping });
  });

  socket.on("edit-message", ({ sessionId, messageId, newContent }) => {
    if (!sessionId || !sessions.has(sessionId)) return;
    io.to(sessionId).emit("message-edited", { messageId, newContent });
  });

  socket.on("clear-request", ({ sessionId, type, requester }) => {
    if (!sessionId || !sessions.has(sessionId)) return;
    if (type === "local") {
      socket.emit("chat-cleared", { type: "local" });
    } else {
      socket.to(sessionId).emit("clear-permission-request", { requester });
    }
  });

  socket.on("clear-response", ({ sessionId, accepted }) => {
    if (!sessionId || !sessions.has(sessionId)) return;
    if (accepted) {
      io.to(sessionId).emit("chat-cleared", { type: "both" });
    }
  });

  socket.on("messages-read", ({ sessionId, messageIds, reader }) => {
    if (!sessionId || !sessions.has(sessionId)) return;
    socket.to(sessionId).emit("messages-seen", { messageIds, reader });
  });

  socket.on("file-shared", ({ sessionId, file }) => {
    if (!sessionId || !file) return;
    io.to(sessionId).emit("file-shared", file);
  });

  socket.on(
    "invite-user",
    ({ targetId, sessionId, password, inviterName, message }) => {
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        io.to(targetId).emit("invite-received", {
          sessionId,
          password,
          inviterName,
          message,
          inviterId: socket.id,
        });
      }
    },
  );

  socket.on("invite-rejected", ({ targetId, message, declinerName }) => {
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      io.to(targetId).emit("rejection-received", { message, declinerName });
    }
  });

  socket.on("disconnect", () => {
    if (!currentSessionId || !sessions.has(currentSessionId)) return;

    const session = sessions.get(currentSessionId);
    session.users.delete(socket.id);

    const users = Array.from(session.users.values());

    io.to(currentSessionId).emit("user-left", {
      username: currentUsername,
      users,
    });

    if (session.users.size === 0) {
      sessions.delete(currentSessionId);
    }
  });
});

// ── START SERVER (only if run directly) ───────────────────────────────
if (require.main === module) {
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Running on http://localhost:${PORT}`);
  });
}

// ── EXPORT FOR TESTING ────────────────────────────────────────────────
module.exports = app;
