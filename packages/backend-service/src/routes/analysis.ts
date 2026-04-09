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

router.post("/", (req, res) => {
  const parsed = analysisSchema.parse(req.body) as AnalysisRequest;
  const response = analyzeSelection(parsed);
  historyStore.createFromAnalysis(parsed, response);
  res.json(response);
});

export default router;
