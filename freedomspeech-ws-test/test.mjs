import "dotenv/config";
import WebSocket from "ws";
import fs from "node:fs";

const apiKey = process.env.FREEDOMSPEECH_API_KEY;

if (!apiKey) {
  throw new Error("Не найден FREEDOMSPEECH_API_KEY в .env");
}

const ws = new WebSocket(
  `wss://api.freedomspeech.kz/ws/tts?apiKey=${encodeURIComponent(apiKey)}`,
);

const chunks = [];
const startedAt = Date.now();
let firstChunkAt = null;

function createWav(pcmData, sampleRate) {
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}

ws.on("open", () => {
  console.log("WebSocket подключён");

  ws.send(
    JSON.stringify({
      type: "synthesize",
      text: "Сәлеметсіз бе!",
      voice: "tomiris",
      language: "kk",
      requestId: "test-1",
    }),
  );

  console.log("Текст отправлен на синтез");
});

ws.on("message", (data) => {
  const message = JSON.parse(data.toString());

  if (message.type === "audio_chunk") {
    if (firstChunkAt === null) {
      firstChunkAt = Date.now();
      console.log(`Первый аудиочанк получен за ${firstChunkAt - startedAt} мс`);
    }

    const audioBuffer = Buffer.from(message.audio, "base64");
    chunks.push(audioBuffer);

    console.log(`Чанк №${message.chunkIndex}: ${audioBuffer.length} байт`);
  }

  if (message.type === "audio_end") {
    console.log("Sample rate:", message.sampleRate);
    const pcmData = Buffer.concat(chunks);
    const wav = createWav(pcmData, message.sampleRate);

    fs.writeFileSync("stream-test.wav", wav);

    console.log("Синтез завершён");
    console.log(`Всего чанков: ${message.totalChunks}`);
    console.log(`Размер WAV: ${wav.length} байт`);
    console.log(`Общее время: ${Date.now() - startedAt} мс`);

    ws.close();
  }

  if (message.type === "error") {
    console.error("Ошибка FreedomSpeech:", message);
    ws.close();
  }
});

ws.on("error", (error) => {
  console.error("Ошибка WebSocket:", error.message);
});

ws.on("close", () => {
  console.log("WebSocket закрыт");
});
