import express, { Router } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chat, createSession } from "./controllers/ai.controller";

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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
