import crypto from "node:crypto";
import type {
  AnalysisRequest,
  AnalysisResponse,
  ChatResponse,
  SessionDetailResponse,
  SessionListItem
} from "@c-pointer/shared";
import { database } from "../lib/database.js";

interface StoredContextFile {
  contextFileId: string;
  filePath: string;
  role: string;
  sha: string;
  githubUrl: string;
  excerpt: string;
  content: string;
}

export interface SessionConversationContext {
  session: {
    sessionId: string;
    componentName: string;
    workspace: "web" | "pos";
    environment: "test" | "uat" | "local";
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
  snapshot: {
    snapshotId: string;
    dataInspPath: string;
    filePath: string;
    line: number;
    column: number;
    componentName: string;
    githubUrl: string;
    selectedText: string | null;
    domTag: string | null;
  };
  contextFiles: StoredContextFile[];
}

interface CreateSessionInput {
  request: AnalysisRequest;
  response: AnalysisResponse;
  summary: {
    confirmedFacts: string[];
    openQuestions: string[];
  };
  contextFiles: Array<{
    filePath: string;
    role: string;
    sha: string;
    githubUrl: string;
    content: string;
  }>;
}

interface AppendChatInput {
  deviceUserId: string;
  sessionId: string;
  userMessage: string;
  response: ChatResponse;
  confirmedFacts: string[];
  openQuestions: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function futureIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function parseJsonList(value: string): string[] {
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

function excerptContent(content: string): string {
  return content.length > 1400 ? `${content.slice(0, 1400)}\n...` : content;
}

class HistoryStore {
  cleanupExpired(now = nowIso()): number {
    const deleted = database.prepare(`
      DELETE FROM analysis_sessions
      WHERE expires_at < ?
    `).run(now);

    return deleted.changes;
  }

  touchDevice(deviceUserId: string): void {
    const timestamp = nowIso();
    database.prepare(`
      INSERT INTO device_users (device_user_id, created_at, last_seen_at)
      VALUES (@deviceUserId, @createdAt, @lastSeenAt)
      ON CONFLICT(device_user_id) DO UPDATE SET
        last_seen_at = excluded.last_seen_at
    `).run({
      deviceUserId,
      createdAt: timestamp,
      lastSeenAt: timestamp
    });
  }

  createFromAnalysis(input: CreateSessionInput): void {
    const timestamp = nowIso();
    const expiresAt = futureIso(30);

    this.touchDevice(input.request.deviceUserId);

    const transaction = database.transaction(() => {
      database.prepare(`
        INSERT INTO analysis_sessions (
          session_id, device_user_id, component_name, workspace, environment, page_url, repo, branch, commit_sha,
          status, created_at, updated_at, expires_at
        ) VALUES (
          @sessionId, @deviceUserId, @componentName, @workspace, @environment, @pageUrl, @repo, @branch, @commitSha,
          @status, @createdAt, @updatedAt, @expiresAt
        )
      `).run({
        sessionId: input.response.sessionId,
        deviceUserId: input.request.deviceUserId,
        componentName: input.response.component.name,
        workspace: input.request.workspace,
        environment: input.request.environment,
        pageUrl: input.request.pageUrl,
        repo: input.response.component.repo,
        branch: input.response.component.branch,
        commitSha: input.response.component.commitSha,
        status: "ready",
        createdAt: timestamp,
        updatedAt: timestamp,
        expiresAt
      });

      database.prepare(`
        INSERT INTO session_summaries (
          session_id, summary_text, confirmed_facts_json, open_questions_json, updated_at
        ) VALUES (
          @sessionId, @summaryText, @confirmedFactsJson, @openQuestionsJson, @updatedAt
        )
      `).run({
        sessionId: input.response.sessionId,
        summaryText: input.response.analysis.summary,
        confirmedFactsJson: JSON.stringify(input.summary.confirmedFacts),
        openQuestionsJson: JSON.stringify(input.summary.openQuestions),
        updatedAt: timestamp
      });

      database.prepare(`
        INSERT INTO component_context_snapshots (
          snapshot_id, session_id, data_insp_path, file_path, line, column, component_name, github_url,
          selected_text, dom_tag, created_at
        ) VALUES (
          @snapshotId, @sessionId, @dataInspPath, @filePath, @line, @column, @componentName, @githubUrl,
          @selectedText, @domTag, @createdAt
        )
      `).run({
        snapshotId: input.response.snapshotId,
        sessionId: input.response.sessionId,
        dataInspPath: input.request.selection.dataInspPath,
        filePath: input.response.component.filePath,
        line: input.response.component.line,
        column: input.response.component.column,
        componentName: input.response.component.name,
        githubUrl: input.response.component.githubUrl,
        selectedText: input.request.selection.selectedText ?? null,
        domTag: input.request.selection.domTag ?? null,
        createdAt: timestamp
      });

      database.prepare(`
        INSERT INTO session_messages (message_id, session_id, role, content, created_at)
        VALUES (@messageId, @sessionId, @role, @content, @createdAt)
      `).run({
        messageId: createId("msg"),
        sessionId: input.response.sessionId,
        role: "assistant",
        content: input.response.analysis.summary,
        createdAt: timestamp
      });

      const insertContextFile = database.prepare(`
        INSERT INTO context_files (
          context_file_id, session_id, snapshot_id, file_path, role, sha, github_url, excerpt, content, created_at
        ) VALUES (
          @contextFileId, @sessionId, @snapshotId, @filePath, @role, @sha, @githubUrl, @excerpt, @content, @createdAt
        )
      `);

      for (const file of input.contextFiles) {
        insertContextFile.run({
          contextFileId: createId("ctx"),
          sessionId: input.response.sessionId,
          snapshotId: input.response.snapshotId,
          filePath: file.filePath,
          role: file.role,
          sha: file.sha,
          githubUrl: file.githubUrl,
          excerpt: excerptContent(file.content),
          content: file.content,
          createdAt: timestamp
        });
      }
    });

    transaction();
  }

  appendChat(input: AppendChatInput): void {
    const context = this.getConversationContext(input.deviceUserId, input.sessionId);
    if (!context) {
      return;
    }

    const timestamp = nowIso();
    const expiresAt = futureIso(30);

    const transaction = database.transaction(() => {
      const insertMessage = database.prepare(`
        INSERT INTO session_messages (message_id, session_id, role, content, created_at)
        VALUES (@messageId, @sessionId, @role, @content, @createdAt)
      `);

      insertMessage.run({
        messageId: createId("msg"),
        sessionId: input.sessionId,
        role: "user",
        content: input.userMessage,
        createdAt: timestamp
      });

      insertMessage.run({
        messageId: input.response.messageId,
        sessionId: input.sessionId,
        role: "assistant",
        content: input.response.answer.details,
        createdAt: timestamp
      });

      database.prepare(`
        UPDATE analysis_sessions
        SET updated_at = @updatedAt, expires_at = @expiresAt
        WHERE session_id = @sessionId
      `).run({
        sessionId: input.sessionId,
        updatedAt: timestamp,
        expiresAt
      });

      database.prepare(`
        UPDATE session_summaries
        SET summary_text = @summaryText,
            confirmed_facts_json = @confirmedFactsJson,
            open_questions_json = @openQuestionsJson,
            updated_at = @updatedAt
        WHERE session_id = @sessionId
      `).run({
        sessionId: input.sessionId,
        summaryText: input.response.answer.summary,
        confirmedFactsJson: JSON.stringify(Array.from(new Set([
          ...context.summary.confirmedFacts,
          ...input.confirmedFacts
        ]))),
        openQuestionsJson: JSON.stringify(input.openQuestions),
        updatedAt: timestamp
      });
    });

    transaction();
  }

  list(deviceUserId: string): SessionListItem[] {
    this.touchDevice(deviceUserId);

    const rows = database.prepare(`
      SELECT session_id, component_name, workspace, environment, page_url, updated_at
      FROM analysis_sessions
      WHERE device_user_id = ?
      ORDER BY updated_at DESC
    `).all(deviceUserId) as Array<{
      session_id: string;
      component_name: string;
      workspace: "web" | "pos";
      environment: "test" | "uat" | "local";
      page_url: string;
      updated_at: string;
    }>;

    return rows.map((row) => ({
      sessionId: row.session_id,
      componentName: row.component_name,
      workspace: row.workspace,
      environment: row.environment,
      pageUrl: row.page_url,
      lastMessageAt: row.updated_at
    }));
  }

  detail(deviceUserId: string, sessionId: string): SessionDetailResponse | null {
    const context = this.getConversationContext(deviceUserId, sessionId);
    if (!context) {
      return null;
    }

    return {
      session: context.session,
      summary: context.summary,
      recentMessages: context.recentMessages
    };
  }

  getConversationContext(deviceUserId: string, sessionId: string): SessionConversationContext | null {
    this.touchDevice(deviceUserId);

    const session = database.prepare(`
      SELECT session_id, component_name, workspace, environment, page_url, repo, branch, commit_sha
      FROM analysis_sessions
      WHERE device_user_id = ? AND session_id = ?
    `).get(deviceUserId, sessionId) as {
      session_id: string;
      component_name: string;
      workspace: "web" | "pos";
      environment: "test" | "uat" | "local";
      page_url: string;
      repo: string;
      branch: string;
      commit_sha: string;
    } | undefined;

    if (!session) {
      return null;
    }

    const summary = database.prepare(`
      SELECT summary_text, confirmed_facts_json, open_questions_json
      FROM session_summaries
      WHERE session_id = ?
    `).get(sessionId) as {
      summary_text: string;
      confirmed_facts_json: string;
      open_questions_json: string;
    };

    const snapshot = database.prepare(`
      SELECT snapshot_id, data_insp_path, file_path, line, column, component_name, github_url, selected_text, dom_tag
      FROM component_context_snapshots
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(sessionId) as {
      snapshot_id: string;
      data_insp_path: string;
      file_path: string;
      line: number;
      column: number;
      component_name: string;
      github_url: string;
      selected_text: string | null;
      dom_tag: string | null;
    };

    const messages = database.prepare(`
      SELECT role, content
      FROM session_messages
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(sessionId) as Array<{
      role: "user" | "assistant";
      content: string;
    }>;

    const files = database.prepare(`
      SELECT context_file_id, file_path, role, sha, github_url, excerpt, content
      FROM context_files
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId) as Array<{
      context_file_id: string;
      file_path: string;
      role: string;
      sha: string;
      github_url: string;
      excerpt: string;
      content: string;
    }>;

    return {
      session: {
        sessionId: session.session_id,
        componentName: session.component_name,
        workspace: session.workspace,
        environment: session.environment,
        pageUrl: session.page_url,
        repo: session.repo,
        branch: session.branch,
        commitSha: session.commit_sha
      },
      summary: {
        summaryText: summary.summary_text,
        confirmedFacts: parseJsonList(summary.confirmed_facts_json),
        openQuestions: parseJsonList(summary.open_questions_json)
      },
      recentMessages: messages.reverse(),
      snapshot: {
        snapshotId: snapshot.snapshot_id,
        dataInspPath: snapshot.data_insp_path,
        filePath: snapshot.file_path,
        line: snapshot.line,
        column: snapshot.column,
        componentName: snapshot.component_name,
        githubUrl: snapshot.github_url,
        selectedText: snapshot.selected_text,
        domTag: snapshot.dom_tag
      },
      contextFiles: files.map((file) => ({
        contextFileId: file.context_file_id,
        filePath: file.file_path,
        role: file.role,
        sha: file.sha,
        githubUrl: file.github_url,
        excerpt: file.excerpt,
        content: file.content
      }))
    };
  }
}

export const historyStore = new HistoryStore();
