import { Router } from "express";
import type { HealthResponse } from "@c-pointer/shared";
import { config } from "../lib/config.js";
import { historyStore } from "../services/historyStore.js";

const router = Router();

router.get("/", (_req, res) => {
  historyStore.cleanupExpired();

  const response: HealthResponse = {
    status: "ok",
    checks: {
      github: config.githubToken ? "ok" : "missing",
      openai: config.openAiApiKey ? "ok" : "missing",
      historyStore: "ok"
    }
  };

  res.json(response);
});

export default router;
