import type {
  AnalysisRequest,
  AnalysisResponse,
  ChatRequest,
  ChatResponse
} from "@c-pointer/shared";
import { config } from "../lib/config.js";
import { parseInspectorPath } from "../lib/parseInspectorPath.js";

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function analyzeSelection(request: AnalysisRequest): AnalysisResponse {
  const parsed = parseInspectorPath(request.selection.dataInspPath);
  const sessionId = createId("sess");
  const snapshotId = createId("snap");
  const githubUrl = `https://github.com/${config.githubRepo}/blob/${config.defaultBranch}/${parsed.filePath}#L${parsed.line}`;

  return {
    sessionId,
    snapshotId,
    component: {
      name: parsed.componentName,
      filePath: parsed.filePath,
      line: parsed.line,
      column: parsed.column,
      workspace: request.workspace,
      environment: request.environment,
      repo: config.githubRepo,
      branch: config.defaultBranch,
      commitSha: "mock-sha",
      confidence: "high",
      githubUrl
    },
    analysis: {
      summary: `${parsed.componentName} is the selected UI entry point for ${request.workspace.toUpperCase()} and is currently analyzed through mocked backend intelligence.`,
      displayContent: [
        "Primary action area for the selected DOM region",
        `Selected text: ${request.selection.selectedText || "N/A"}`
      ],
      interactions: [
        {
          action: "Click selected component",
          effect: "Open the analyzer drawer and fetch contextual analysis"
        }
      ],
      states: [
        {
          name: "selected",
          description: "The component is currently selected from the page."
        },
        {
          name: "analyzed",
          description: "The mocked backend has returned initial summary and evidence."
        }
      ],
      dependencies: [
        {
          filePath: parsed.filePath,
          role: "target_component"
        },
        {
          filePath: "libs/modules/cart/services/src/lib/cart-service.ts",
          role: "service"
        }
      ],
      evidence: {
        targetFilePath: parsed.filePath,
        relatedFiles: [
          "libs/modules/cart/services/src/lib/cart-service.ts"
        ],
        confidence: "high"
      }
    }
  };
}

export function answerQuestion(request: ChatRequest): ChatResponse {
  return {
    sessionId: request.sessionId,
    messageId: createId("msg"),
    answer: {
      summary: "The follow-up answer reuses the current session summary and mocked code context.",
      details: `Mocked response for: "${request.message}". In the real flow, the backend will expand the relevant repo files and ask GPT with the current session summary.`,
      evidence: {
        targetFilePath: "libs/modules/cart/components/src/lib/pos-add-service-items/pos-add-service-items.tsx",
        relatedFiles: [
          "libs/modules/cart/services/src/lib/cart-service.ts"
        ],
        confidence: "medium"
      }
    },
    summaryUpdated: true
  };
}
