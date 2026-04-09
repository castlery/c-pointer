import { Router } from "express";
import type { HealthResponse } from "@c-pointer/shared";
import { database } from "../lib/database.js";
import { verifyGithubRepoAccess } from "../lib/githubClient.js";
import { verifyOpenAiAccess } from "../lib/openAiClient.js";
import { historyStore } from "../services/historyStore.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    historyStore.cleanupExpired();
    database.prepare("SELECT 1").get();

    const [github, openai] = await Promise.all([
      verifyGithubRepoAccess(),
      verifyOpenAiAccess()
    ]);

    const response: HealthResponse = {
      status: github === "error" || openai === "error" ? "error" : "ok",
      checks: {
        github,
        openai,
        historyStore: "ok"
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
