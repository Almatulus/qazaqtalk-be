import type { Request, Response } from "express";
import { getAIResponse, createLiveSession } from "../services/ai.service.js";

export async function chat(req: Request, res: Response) {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const answer = await getAIResponse(message);

    return res.json({ answer });
  } catch (error) {
    console.error("AI controller error:", error);

    return res.status(500).json({
      error: "Failed to get AI response",
    });
  }
}

export async function createSession(req: Request, res: Response) {
  try {
    const { sdp } = req.body;

    if (typeof sdp !== "string" || !sdp.trim()) {
      return res.status(400).json({
        error: "SDP is required",
      });
    }

    const session = await createLiveSession(sdp);

    return res.status(201).json(session);
  } catch (error) {
    console.error("Live session error:", error);

    return res.status(500).json({
      error: "Failed to create voice session",
    });
  }
}
