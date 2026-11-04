import WebSocket from "ws";

export interface FreedomSpeechMessage {
  type: string;
  requestId?: string;
  audio?: string;
  chunkIndex?: number;
  sampleRate?: number;
  totalChunks?: number;
  code?: string;
  message?: string;
}

interface FreedomSpeechConnection {
  synthesize(text: string, requestId: string): void;
  close(): void;
}

export function connectFreedomSpeech(
  onMessage: (message: FreedomSpeechMessage) => void,
  onError: (error: Error) => void,
): Promise<FreedomSpeechConnection> {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.FREEDOMSPEECH_API_KEY;

    if (!apiKey) {
      reject(new Error("Не найден FREEDOMSPEECH_API_KEY"));
      return;
    }

    const ws = new WebSocket(
      `wss://api.freedomspeech.kz/ws/tts?apiKey=${encodeURIComponent(apiKey)}`,
    );

    let isConnected = false;

    ws.on("open", () => {
      isConnected = true;

      console.log("FreedomSpeech WebSocket connected");

      resolve({
        synthesize(text, requestId) {
          if (ws.readyState !== WebSocket.OPEN) {
            throw new Error("Соединение с FreedomSpeech недоступно");
          }

          ws.send(
            JSON.stringify({
              type: "synthesize",
              text,
              voice: "tomiris",
              language: "kk",
              model: "freedomspeech",
              requestId,
            }),
          );
        },

        close() {
          if (
            ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING
          ) {
            ws.close();
          }
        },
      });
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString()) as FreedomSpeechMessage;

        onMessage(message);
      } catch (error) {
        onError(
          error instanceof Error
            ? error
            : new Error("Ошибка обработки сообщения FreedomSpeech"),
        );
      }
    });

    ws.on("error", (error) => {
      onError(error);

      if (!isConnected) {
        reject(error);
      }
    });

    ws.on("close", () => {
      console.log("FreedomSpeech WebSocket disconnected");
    });
  });
}
