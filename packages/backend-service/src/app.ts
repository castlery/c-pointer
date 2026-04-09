import cors from "cors";
import express from "express";
import analysisRouter from "./routes/analysis.js";
import chatRouter from "./routes/chat.js";
import healthRouter from "./routes/health.js";
import historyRouter from "./routes/history.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      name: "c-pointer-backend",
      version: "0.1.0"
    });
  });

  app.use("/v1/analysis/sessions", analysisRouter);
  app.use("/v1/chat/messages", chatRouter);
  app.use("/v1/history", historyRouter);
  app.use("/v1/health", healthRouter);

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: error.message
    });
  });

  return app;
}
