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

router.post("/", async (req, res, next) => {
  try {
    const parsed = chatSchema.parse(req.body) as ChatRequest;
    const context = historyStore.getConversationContext(parsed.deviceUserId, parsed.sessionId);
    if (!context) {
      res.status(404).json({
        code: "SESSION_NOT_FOUND"
      });
      return;
    }

    const result = await answerQuestion(parsed, context);
    historyStore.appendChat({
      deviceUserId: parsed.deviceUserId,
      sessionId: parsed.sessionId,
      userMessage: parsed.message,
      response: result.response,
      confirmedFacts: result.persistence.confirmedFacts,
      openQuestions: result.persistence.openQuestions
    });
    res.json(result.response);
  } catch (error) {
    next(error);
  }
});

export default router;
