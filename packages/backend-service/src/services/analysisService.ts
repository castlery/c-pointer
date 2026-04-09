import crypto from "node:crypto";
import type {
  AnalysisRequest,
  AnalysisResponse,
  ChatRequest,
  ChatResponse
} from "@c-pointer/shared";
import { config } from "../lib/config.js";
import { findGithubFilePathByHint, getGithubTextFile, getRelatedGithubFiles } from "../lib/githubClient.js";
import { generateFollowUpAnswer, generateInitialAnalysis } from "../lib/openAiClient.js";
import { parseInspectorPath } from "../lib/parseInspectorPath.js";
import type { SessionConversationContext } from "./historyStore.js";

interface FileContext {
  filePath: string;
  sha: string;
  githubUrl: string;
  content: string;
}

interface ResolvedTargetFile {
  file: FileContext;
  branch: string;
}

interface AnalyzeSelectionResult {
  response: AnalysisResponse;
  persistence: {
    confirmedFacts: string[];
    openQuestions: string[];
    contextFiles: Array<FileContext & { role: string }>;
  };
}

interface AnswerQuestionResult {
  response: ChatResponse;
  persistence: {
    confirmedFacts: string[];
    openQuestions: string[];
  };
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function buildInitialPrompt(request: AnalysisRequest, targetFile: FileContext, relatedFiles: Array<FileContext & { role: string }>): string {
  const relatedContext = relatedFiles.map((file) => [
    `Role: ${file.role}`,
    `Path: ${file.filePath}`,
    `Source:`,
    file.content.slice(0, 2400)
  ].join("\n")).join("\n\n---\n\n");

  return [
    "Analyze the selected Castlery frontend component and explain it for product, QA, and engineering readers.",
    "Return JSON with fields: summary, displayContent[], interactions[], states[], dependencies[], confirmedFacts[], openQuestions[].",
    "",
    `Workspace: ${request.workspace}`,
    `Environment: ${request.environment}`,
    `Page URL: ${request.pageUrl}`,
    `Selected text: ${request.selection.selectedText || "N/A"}`,
    `DOM tag: ${request.selection.domTag || "N/A"}`,
    `Inspector path: ${request.selection.dataInspPath}`,
    "",
    `Target file path: ${targetFile.filePath}`,
    "Target source:",
    targetFile.content.slice(0, 8000),
    "",
    relatedContext ? `Related files:\n${relatedContext}` : "Related files: none resolved"
  ].join("\n");
}

function buildFollowUpPrompt(request: ChatRequest, context: SessionConversationContext): string {
  const relatedContext = context.contextFiles.map((file) => [
    `Role: ${file.role}`,
    `Path: ${file.filePath}`,
    "Source:",
    file.content.slice(0, 2200)
  ].join("\n")).join("\n\n---\n\n");

  const conversation = context.recentMessages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n");

  return [
    "Answer the follow-up question using the current Castlery code context.",
    "Return JSON with fields: summary, details, confirmedFacts[], openQuestions[].",
    "",
    `Question: ${request.message}`,
    `Workspace: ${context.session.workspace}`,
    `Environment: ${context.session.environment}`,
    `Page URL: ${context.session.pageUrl}`,
    `Summary so far: ${context.summary.summaryText}`,
    `Confirmed facts: ${context.summary.confirmedFacts.join(" | ") || "none"}`,
    `Open questions: ${context.summary.openQuestions.join(" | ") || "none"}`,
    "",
    `Target snapshot: ${context.snapshot.filePath}:${context.snapshot.line}:${context.snapshot.column}:${context.snapshot.componentName}`,
    "",
    "Recent conversation:",
    conversation || "No prior conversation",
    "",
    `Code context:\n${relatedContext}`
  ].join("\n");
}

async function resolveTargetFile(filePath: string): Promise<ResolvedTargetFile> {
  const candidates = Array.from(new Set([
    config.defaultBranch,
    "develop",
    "master",
    "main"
  ]));

  for (const branch of candidates) {
    try {
      const file = await getGithubTextFile(filePath, branch);
      return {
        file,
        branch
      };
    } catch {
      const resolvedPath = await findGithubFilePathByHint(filePath, branch).catch(() => null);
      if (!resolvedPath) {
        continue;
      }

      const file = await getGithubTextFile(resolvedPath, branch);
      return {
        file,
        branch
      };
    }
  }

  throw new Error(`GitHub lookup failed for ${filePath}`);
}

export async function analyzeSelection(request: AnalysisRequest): Promise<AnalyzeSelectionResult> {
  const parsed = parseInspectorPath(request.selection.dataInspPath);
  const resolvedTarget = await resolveTargetFile(parsed.filePath);
  const targetFile = resolvedTarget.file;
  const relatedFiles = await getRelatedGithubFiles(targetFile.filePath, targetFile.content, resolvedTarget.branch);
  const prompt = buildInitialPrompt(
    request,
    targetFile,
    relatedFiles.map((file) => ({ ...file, role: "related_dependency" }))
  );
  const aiResult = await generateInitialAnalysis(prompt);

  const sessionId = createId("sess");
  const snapshotId = createId("snap");

  return {
    response: {
      sessionId,
      snapshotId,
      component: {
        name: parsed.componentName,
        filePath: targetFile.filePath,
        line: parsed.line,
        column: parsed.column,
        workspace: request.workspace,
        environment: request.environment,
        repo: config.githubRepo,
        branch: resolvedTarget.branch,
        commitSha: targetFile.sha,
        confidence: relatedFiles.length ? "high" : "medium",
        githubUrl: targetFile.githubUrl
      },
      analysis: {
        summary: aiResult.summary,
        displayContent: aiResult.displayContent ?? [],
        interactions: aiResult.interactions ?? [],
        states: aiResult.states ?? [],
        dependencies: [
          {
            filePath: targetFile.filePath,
            role: "target_component"
          },
          ...(aiResult.dependencies ?? [])
        ],
        evidence: {
          targetFilePath: targetFile.filePath,
          relatedFiles: relatedFiles.map((file) => file.filePath),
          confidence: relatedFiles.length ? "high" : "medium"
        }
      }
    },
    persistence: {
      confirmedFacts: [
        `Target file: ${targetFile.filePath}`,
        `Branch: ${resolvedTarget.branch}`,
        ...(aiResult.confirmedFacts ?? [])
      ],
      openQuestions: aiResult.openQuestions ?? [],
      contextFiles: [
        {
          ...targetFile,
          role: "target_component"
        },
        ...relatedFiles.map((file) => ({
          ...file,
          role: "related_dependency"
        }))
      ]
    }
  };
}

export async function answerQuestion(
  request: ChatRequest,
  context: SessionConversationContext
): Promise<AnswerQuestionResult> {
  const prompt = buildFollowUpPrompt(request, context);
  const aiResult = await generateFollowUpAnswer(prompt);

  return {
    response: {
      sessionId: request.sessionId,
      messageId: createId("msg"),
      answer: {
        summary: aiResult.summary,
        details: aiResult.details,
        evidence: {
          targetFilePath: context.snapshot.filePath,
          relatedFiles: context.contextFiles.map((file) => file.filePath),
          confidence: context.contextFiles.length > 1 ? "high" : "medium"
        }
      },
      summaryUpdated: true
    },
    persistence: {
      confirmedFacts: aiResult.confirmedFacts ?? [],
      openQuestions: aiResult.openQuestions ?? []
    }
  };
}
