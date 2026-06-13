import express from "express";
import path from "path";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface Session {
  receiverId?: string;
  senderId?: string;
  receiverSocket?: WebSocket;
  senderSocket?: WebSocket;
  settings?: {
    fps: number;
    resolution: string;
    connectionType: 'wifi' | 'bluetooth';
    quality: string;
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);

  // In-memory active casting sessions
  const sessions = new Map<string, Session>();

  // Initialize WebSockets on the server
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade manually to hook into Express HTTP server
  httpServer.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws: WebSocket) => {
    let clientSessionId: string | null = null;
    let clientRole: "receiver" | "sender" | null = null;

    ws.on("message", (message: string) => {
      try {
        const payload = JSON.parse(message.toString());
        const { type, sessionId } = payload;

        if (!sessionId) return;

        if (type === "register-receiver") {
          clientSessionId = sessionId;
          clientRole = "receiver";

          const current = sessions.get(sessionId) || {};
          current.receiverSocket = ws;
          sessions.set(sessionId, current);

          // Notify sender if already present
          if (current.senderSocket && current.senderSocket.readyState === WebSocket.OPEN) {
            current.senderSocket.send(JSON.stringify({ type: "receiver-connected" }));
            ws.send(JSON.stringify({ type: "sender-connected", settings: current.settings }));
          } else {
            ws.send(JSON.stringify({ type: "waiting-for-sender" }));
          }
        } 
        
        else if (type === "register-sender") {
          clientSessionId = sessionId;
          clientRole = "sender";

          const current = sessions.get(sessionId) || {};
          current.senderSocket = ws;
          sessions.set(sessionId, current);

          // Notify receiver that sender joined
          if (current.receiverSocket && current.receiverSocket.readyState === WebSocket.OPEN) {
            current.receiverSocket.send(JSON.stringify({ type: "sender-connected", settings: payload.settings }));
            ws.send(JSON.stringify({ type: "receiver-connected" }));
          } else {
            ws.send(JSON.stringify({ type: "waiting-for-receiver" }));
          }
        } 
        
        else if (type === "frame" && clientRole === "sender") {
          // Relate the frame buffer instantly from sender to receiver
          const current = sessions.get(sessionId);
          if (current && current.receiverSocket && current.receiverSocket.readyState === WebSocket.OPEN) {
            current.receiverSocket.send(message.toString());
          }
        } 
        
        else if (type === "settings-change") {
          const current = sessions.get(sessionId);
          if (current) {
            current.settings = payload.settings;
            // relay details
            const target = clientRole === "sender" ? current.receiverSocket : current.senderSocket;
            if (target && target.readyState === WebSocket.OPEN) {
              target.send(message.toString());
            }
          }
        }

        else if (type === "ping") {
          // Return pong to measure connection delay
          ws.send(JSON.stringify({ type: "pong", timestamp: payload.timestamp }));
        }

        else if (type === "pointer-event" && clientRole === "receiver") {
          // Relate mouse clicks/gestures from receiver (computer click mirroring) back to simulated iPhone
          const current = sessions.get(sessionId);
          if (current && current.senderSocket && current.senderSocket.readyState === WebSocket.OPEN) {
            current.senderSocket.send(message.toString());
          }
        }

      } catch (err) {
        console.error("Error parsing WebSocket message: ", err);
      }
    });

    ws.on("close", () => {
      if (clientSessionId && clientRole) {
        const current = sessions.get(clientSessionId);
        if (current) {
          if (clientRole === "receiver") {
            current.receiverSocket = undefined;
            if (current.senderSocket && current.senderSocket.readyState === WebSocket.OPEN) {
              current.senderSocket.send(JSON.stringify({ type: "receiver-disconnected" }));
            }
          } else {
            current.senderSocket = undefined;
            if (current.receiverSocket && current.receiverSocket.readyState === WebSocket.OPEN) {
              current.receiverSocket.send(JSON.stringify({ type: "sender-disconnected" }));
            }
          }

          // Clean up empty sessions
          if (!current.receiverSocket && !current.senderSocket) {
            sessions.delete(clientSessionId);
          }
        }
      }
    });
  });

  // REST API Endpoint: Status Check
  app.get("/api/sessions", (req, res) => {
    const list = Array.from(sessions.entries()).map(([id, info]) => ({
      sessionId: id,
      hasReceiver: !!info.receiverSocket,
      hasSender: !!info.senderSocket,
      settings: info.settings
    }));
    res.json(list);
  });

  // Vite development integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production builds
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server launched successfully at http://localhost:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error("Failed to start server", e);
});
