import type {
  AnalysisRequest,
  AnalysisResponse,
  ChatResponse,
  SessionDetailResponse,
  SessionListItem
} from "@c-pointer/shared";

type MessageRole = "user" | "assistant";

interface StoredSession {
  sessionId: string;
  deviceUserId: string;
  componentName: string;
  workspace: "web" | "pos";
  environment: "test" | "uat" | "local";
  pageUrl: string;
  repo: string;
  branch: string;
  commitSha: string;
  updatedAt: string;
  expiresAt: string;
  summary: {
    summaryText: string;
    confirmedFacts: string[];
    openQuestions: string[];
  };
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
}

class HistoryStore {
  private sessions = new Map<string, StoredSession>();

  createFromAnalysis(request: AnalysisRequest, response: AnalysisResponse): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const componentName = response.component.name;
    const summaryText = response.analysis.summary;

    this.sessions.set(response.sessionId, {
      sessionId: response.sessionId,
      deviceUserId: request.deviceUserId,
      componentName,
      workspace: request.workspace,
      environment: request.environment,
      pageUrl: request.pageUrl,
      repo: response.component.repo,
      branch: response.component.branch,
      commitSha: response.component.commitSha,
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      summary: {
        summaryText,
        confirmedFacts: [
          `Target file: ${response.component.filePath}`,
          `Workspace: ${request.workspace}`,
          `Environment: ${request.environment}`
        ],
        openQuestions: [
          "What other user flows depend on this component?"
        ]
      },
      messages: [
        {
          role: "assistant",
          content: summaryText
        }
      ]
    });
  }

  appendChat(deviceUserId: string, sessionId: string, userMessage: string, response: ChatResponse): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.deviceUserId !== deviceUserId) {
      return;
    }

    session.messages.push(
      {
        role: "user",
        content: userMessage
      },
      {
        role: "assistant",
        content: response.answer.details
      }
    );

    session.summary.summaryText = response.answer.summary;
    session.summary.confirmedFacts = Array.from(
      new Set([
        ...session.summary.confirmedFacts,
        ...response.answer.evidence.relatedFiles.map((file) => `Related file: ${file}`)
      ])
    );
    session.summary.openQuestions = [
      "Need real GitHub lookup and GPT-backed answer in implementation phase"
    ];

    const now = new Date();
    session.updatedAt = now.toISOString();
    session.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-20);
    }
  }

  list(deviceUserId: string): SessionListItem[] {
    return Array.from(this.sessions.values())
      .filter((session) => session.deviceUserId === deviceUserId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((session) => ({
        sessionId: session.sessionId,
        componentName: session.componentName,
        workspace: session.workspace,
        environment: session.environment,
        pageUrl: session.pageUrl,
        lastMessageAt: session.updatedAt
      }));
  }

  detail(deviceUserId: string, sessionId: string): SessionDetailResponse | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.deviceUserId !== deviceUserId) {
      return null;
    }

    return {
      session: {
        sessionId: session.sessionId,
        componentName: session.componentName,
        workspace: session.workspace,
        environment: session.environment,
        pageUrl: session.pageUrl,
        repo: session.repo,
        branch: session.branch,
        commitSha: session.commitSha
      },
      summary: session.summary,
      recentMessages: session.messages.slice(-10)
    };
  }

  cleanupExpired(now = new Date()): number {
    let removed = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now.toISOString()) {
        this.sessions.delete(sessionId);
        removed += 1;
      }
    }

    return removed;
  }
}

export const historyStore = new HistoryStore();
