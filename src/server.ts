import express, { Router } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import dotenv from "dotenv";

import { chat, createSession } from "./controllers/ai.controller";
import { connectFreedomSpeech } from "./services/freedomSpeech.service";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const router = Router();

router.post("/chat", chat);
router.post("/session", createSession);

app.use("/api/ai", router);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "QazaqTalk backend is running",
  });
});

const server = createServer(app);

const wss = new WebSocketServer({
  server,
  path: "/api/ai/tts-stream",
});

wss.on("connection", (client) => {
  console.log("Frontend TTS WebSocket connected");

  const freedomSpeechPromise = connectFreedomSpeech(
    (message) => {
      console.log("FreedomSpeech response:", {
        type: message.type,
        requestId: message.requestId,
        chunkIndex: message.chunkIndex,
      });

      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    },
    (error) => {
      console.error("FreedomSpeech error:", error);

      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "error",
            message: error.message || "Ошибка сервиса синтеза речи",
          }),
        );
      }
    },
  );

  // Предотвращаем необработанное отклонение Promise.
  void freedomSpeechPromise.catch(() => {});

  // Получаем запрос от frontend.
  client.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());

      console.log("Frontend TTS request:", {
        type: message.type,
        requestId: message.requestId,
        text: message.text,
      });

      if (
        message.type !== "synthesize" ||
        typeof message.text !== "string" ||
        !message.text.trim() ||
        typeof message.requestId !== "string"
      ) {
        client.send(
          JSON.stringify({
            type: "error",
            message: "Некорректный запрос синтеза",
          }),
        );
        return;
      }

      // Ждём подключения к FreedomSpeech.
      const freedomSpeech = await freedomSpeechPromise;

      // Отправляем текст на синтез.
      const text = "<slower>Привет, как твои дела?</slower>";

      console.log("TTS TEXT:", text);

      freedomSpeech.synthesize(message.text, message.requestId);

      console.log("Text sent to FreedomSpeech:", message.requestId);
    } catch (error) {
      console.error("TTS request error:", error);

      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Не удалось отправить текст на синтез",
          }),
        );
      }
    }
  });

  client.on("close", (code, reason) => {
    console.log("Frontend TTS WebSocket disconnected:", {
      code,
      reason: reason.toString(),
    });

    void freedomSpeechPromise
      .then((freedomSpeech) => {
        freedomSpeech.close();
      })
      .catch((error) => {
        console.error("FreedomSpeech close error:", error);
      });
  });

  client.on("error", (error) => {
    console.error("Frontend WebSocket error:", error);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
