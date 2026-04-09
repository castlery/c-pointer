import { Router } from "express";
import { z } from "zod";
import type { ChatRequest } from "@c-pointer/shared";
import { answerQuestion } from "../services/analysisService.js";
import { historyStore } from "../services/historyStore.js";

const router = Router();

const chatSchema = z.object({
  deviceUserId: z.string().min(1),
  sessionId: z.string().min(1),
  message: z.string().min(1)
});

router.post("/", (req, res) => {
  const parsed = chatSchema.parse(req.body) as ChatRequest;
  const response = answerQuestion(parsed);
  historyStore.appendChat(parsed.deviceUserId, parsed.sessionId, parsed.message, response);
  res.json(response);
});

export default router;
