const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require('crypto');
const { randomUUID } = require("crypto");

const app = express();
app.use(cors({ origin: ["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3001"] }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*"} }); // tighten in prod

// Track sockets automatically by socket.id
const socketsById = new Map();           // socket.id -> socket
const pending = new Map();               // requestId -> {resolve,reject,timeout}

io.on("connection", (socket) => {
  socketsById.set(socket.id, socket);
  // Let the client know its server-assigned id
  socket.emit("server:assigned-id", { socketId: socket.id });

  socket.on("rpc:response", ({ requestId, payload, error }) => {
    const p = pending.get(requestId);
    if (!p) return;
    clearTimeout(p.timeout);
    pending.delete(requestId);
    error ? p.reject(new Error(error)) : p.resolve(payload);
  });

  socket.on("disconnect", () => {
    socketsById.delete(socket.id);
  });
});

// Helper: RPC to a specific socket.id
function rpcToSocketId(socketId, event, payload, { timeoutMs = 4000 } = {}) {
  const s = socketsById.get(socketId);
  if (!s) return Promise.reject(new Error(`socket ${socketId} is offline`));
  const requestId = randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error(`RPC timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(requestId, { resolve, reject, timeout });
    s.emit("rpc:request", { requestId, event, payload });
  });
}

// ---- REST API ----

// List online sockets (so you can pick one)
app.get("/sockets", (_req, res) => {
  res.json({ sockets: [...socketsById.keys()] });
});

// Ask one specific tab for its current data
app.get("/sockets/:id/data", async (req, res) => {
  try {
    const data = await rpcToSocketId(req.params.id, "getData", {});
    res.json({ socketId: req.params.id, data });
  } catch (e) {
    res.status(504).json({ error: e.message });
  }
});

// “Hops”: query multiple sockets (by ids or by count n) and combine
app.get("/hops", async (req, res) => {
  const n = parseInt(req.query.n ?? "0", 10);
  if (!n || n <= 0)
    return res.status(400).json({ error: "Provide ?n=<positive number>" });

  const allIds = [...socketsById.keys()];
  if (allIds.length === 0)
    return res.status(503).json({ error: "No clients connected" });

  // Pick the first n sockets (or randomize if you want)
  const ids = allIds.sort(() => 0.5 - Math.random()).slice(0, n);

  try {
    const results = await Promise.allSettled(
      ids.map(id =>
        rpcToSocketId(id, "getData", {}, { timeoutMs: 4000 })
          .then(r => ({ id, value: r.value || "" }))
      )
    );

    // Keep only fulfilled ones
    const ok = results.filter(r => r.status === "fulfilled").map(r => r.value);
    const total = ok.reduce((sum, x) => sum + x.value, "");
    const hash = crypto.createHash('md5').update(total).digest('hex');


    res.json({
      queried: ids.length,
      responded: ok.length,
      total,
      hash,
      details: ok,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

server.listen(3000, () => {
  console.log("Server on http://localhost:3000");
});
