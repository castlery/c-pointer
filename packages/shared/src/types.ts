export type WorkspaceName = "web" | "pos";
export type EnvironmentName = "test" | "uat" | "local";
export type AnalysisStatus = "idle" | "loading" | "ready" | "error";

export interface ParsedInspectorPath {
  filePath: string;
  line: number;
  column: number;
  componentName: string;
}

export interface SelectionPayload {
  dataInspPath: string;
  selectedText?: string;
  domTag?: string;
}

export interface AnalysisRequest {
  deviceUserId: string;
  workspace: WorkspaceName;
  environment: EnvironmentName;
  pageUrl: string;
  selection: SelectionPayload;
  options?: {
    analysisDepth?: "light" | "standard";
    includeRelatedFiles?: boolean;
  };
}

export interface EvidencePayload {
  targetFilePath: string;
  relatedFiles: string[];
  confidence: "high" | "medium" | "low";
}

export interface AnalysisResponse {
  sessionId: string;
  snapshotId: string;
  component: {
    name: string;
    filePath: string;
    line: number;
    column: number;
    workspace: WorkspaceName;
    environment: EnvironmentName;
    repo: string;
    branch: string;
    commitSha: string;
    confidence: "high" | "medium" | "low";
    githubUrl: string;
  };
  analysis: {
    summary: string;
    displayContent: string[];
    interactions: Array<{
      action: string;
      effect: string;
    }>;
    states: Array<{
      name: string;
      description: string;
    }>;
    dependencies: Array<{
      filePath: string;
      role: string;
    }>;
    evidence: EvidencePayload;
  };
}

export interface ChatRequest {
  deviceUserId: string;
  sessionId: string;
  message: string;
}

export interface ChatResponse {
  sessionId: string;
  messageId: string;
  answer: {
    summary: string;
    details: string;
    evidence: EvidencePayload;
  };
  summaryUpdated: boolean;
}

export interface SessionListItem {
  sessionId: string;
  componentName: string;
  workspace: WorkspaceName;
  environment: EnvironmentName;
  pageUrl: string;
  lastMessageAt: string;
}

export interface SessionListResponse {
  items: SessionListItem[];
}

export interface SessionDetailResponse {
  session: {
    sessionId: string;
    componentName: string;
    workspace: WorkspaceName;
    environment: EnvironmentName;
    pageUrl: string;
    repo: string;
    branch: string;
    commitSha: string;
  };
  summary: {
    summaryText: string;
    confirmedFacts: string[];
    openQuestions: string[];
  };
  recentMessages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface HealthResponse {
  status: "ok" | "error";
  checks: {
    github: "ok" | "missing";
    openai: "ok" | "missing";
    historyStore: "ok";
  };
}
