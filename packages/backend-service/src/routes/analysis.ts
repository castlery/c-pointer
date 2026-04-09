import { Router } from "express";
import { z } from "zod";
import type { AnalysisRequest } from "@c-pointer/shared";
import { analyzeSelection } from "../services/analysisService.js";
import { historyStore } from "../services/historyStore.js";

const router = Router();

const analysisSchema = z.object({
  deviceUserId: z.string().min(1),
  workspace: z.enum(["web", "pos"]),
  environment: z.enum(["test", "uat", "local"]),
  pageUrl: z.string().url(),
  selection: z.object({
    dataInspPath: z.string().min(1),
    selectedText: z.string().optional(),
    domTag: z.string().optional()
  }),
  options: z.object({
    analysisDepth: z.enum(["light", "standard"]).optional(),
    includeRelatedFiles: z.boolean().optional()
  }).optional()
});

router.post("/", async (req, res, next) => {
  try {
  const parsed = analysisSchema.parse(req.body) as AnalysisRequest;
    const result = await analyzeSelection(parsed);
    historyStore.createFromAnalysis({
      request: parsed,
      response: result.response,
      summary: {
        confirmedFacts: result.persistence.confirmedFacts,
        openQuestions: result.persistence.openQuestions
      },
      contextFiles: result.persistence.contextFiles
    });
    res.json(result.response);
  } catch (error) {
    next(error);
  }
});

export default router;
