import { Router } from "express";
import { z } from "zod";
import { historyStore } from "../services/historyStore.js";

const router = Router();

router.get("/sessions", (req, res) => {
  const parsed = z.object({
    device_user_id: z.string().min(1)
  }).parse(req.query);

  res.json({
    items: historyStore.list(parsed.device_user_id)
  });
});

router.get("/sessions/:sessionId", (req, res) => {
  const parsedQuery = z.object({
    device_user_id: z.string().min(1)
  }).parse(req.query);

  const detail = historyStore.detail(parsedQuery.device_user_id, req.params.sessionId);
  if (!detail) {
    res.status(404).json({
      code: "SESSION_NOT_FOUND"
    });
    return;
  }

  res.json(detail);
});

export default router;
