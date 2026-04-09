import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import type {
  AnalysisResponse,
  ChatResponse,
  SessionListItem,
  WorkspaceName
} from "@c-pointer/shared";
import { Drawer } from "../components/Drawer";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextInput } from "../components/TextInput";
import { apiClient } from "../services/apiClient";
import { fortressCss } from "./styles";

const ROOT_ID = "c-pointer-root";
const SAMPLE_PATH = "libs/modules/cart/components/src/lib/pos-add-service-items/pos-add-service-items.tsx:119:7:Button";

interface HoverSelection {
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  dataInspPath: string | null;
  filePath: string | null;
  componentName: string | null;
  domTag: string;
  selectedText: string | undefined;
}

function inferWorkspace(): WorkspaceName {
  return window.location.hostname.includes("pos-") ? "pos" : "web";
}

function inferEnvironment() {
  return window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1")
    ? "local" as const
    : "test" as const;
}

function parseComponentName(dataInspPath: string): { filePath: string; componentName: string } {
  const parts = dataInspPath.split(":");
  return {
    filePath: parts[0] || "",
    componentName: parts[3] || "UnknownComponent"
  };
}

function resolveInspectorPath(target: HTMLElement | null): string | null {
  let current = target;
  let depth = 0;
  while (current && depth < 12) {
    const direct = current.getAttribute("data-insp-path");
    if (direct) {
      return direct;
    }
    current = current.parentElement;
    depth += 1;
  }
  if (inferEnvironment() === "local") {
    return SAMPLE_PATH;
  }
  return null;
}

function getHoverSelection(target: HTMLElement | null): HoverSelection | null {
  if (!target) {
    return null;
  }

  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const dataInspPath = resolveInspectorPath(target);
  const resolved = dataInspPath ? parseComponentName(dataInspPath) : null;

  return {
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    },
    dataInspPath,
    filePath: resolved?.filePath ?? null,
    componentName: resolved?.componentName ?? null,
    domTag: target.tagName.toLowerCase(),
    selectedText: target.textContent?.trim().slice(0, 120)
  };
}

function isExtensionEvent(event: Event): boolean {
  const composedPath = typeof event.composedPath === "function" ? event.composedPath() : [];
  return composedPath.some((node) => node instanceof HTMLElement && (node.id === ROOT_ID || node.closest?.(`#${ROOT_ID}`)));
}

function formatSessionLabel(item: SessionListItem): string {
  return `${item.workspace.toUpperCase()} · ${item.environment.toUpperCase()}`;
}

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [deviceUserId, setDeviceUserId] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState<ChatResponse | null>(null);
  const [history, setHistory] = useState<SessionListItem[]>([]);
  const [status, setStatus] = useState("Ready");
  const [hovered, setHovered] = useState<HoverSelection | null>(null);

  const workspace = useMemo(() => inferWorkspace(), []);
  const environment = useMemo(() => inferEnvironment(), []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_DEVICE_USER_ID" }, (response) => {
      if (!response?.deviceUserId) {
        return;
      }

      setDeviceUserId(response.deviceUserId);
      void apiClient.listSessions(response.deviceUserId)
        .then((result) => setHistory(result.items))
        .catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    const onMessage = (message: { type?: string }) => {
      if (message.type !== "TOGGLE_ANALYZER") {
        return;
      }

      setDrawerOpen(true);
      setSelectionMode((current) => {
        const next = !current;
        setStatus(next ? "Selection mode on" : "Selection mode off");
        return next;
      });
    };

    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  useEffect(() => {
    if (!selectionMode) {
      setHovered(null);
      document.documentElement.style.cursor = "";
      return;
    }

    document.documentElement.style.cursor = "crosshair";

    const onMouseMove = (event: MouseEvent) => {
      if (isExtensionEvent(event)) {
        return;
      }

      setHovered(getHoverSelection(event.target as HTMLElement | null));
    };

    const onClick = (event: MouseEvent) => {
      if (isExtensionEvent(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const selection = getHoverSelection(event.target as HTMLElement | null);
      if (!selection?.dataInspPath) {
        setStatus("Selected element has no codeInspectorPlugin metadata");
        return;
      }

      if (!deviceUserId) {
        setStatus("Device identity not ready");
        return;
      }

      setDrawerOpen(true);
      setSelectionMode(false);
      setHovered(selection);
      setStatus("Analyzing selected component...");

      void apiClient.createSession({
        deviceUserId,
        workspace,
        environment,
        pageUrl: window.location.href,
        selection: {
          dataInspPath: selection.dataInspPath,
          selectedText: selection.selectedText,
          domTag: selection.domTag
        },
        options: {
          analysisDepth: "standard",
          includeRelatedFiles: true
        }
      }).then((result) => {
        setAnalysis(result);
        setChatAnswer(null);
        setStatus("Analysis ready");
        return apiClient.listSessions(deviceUserId);
      }).then((result) => {
        setHistory(result.items);
      }).catch((error: Error) => {
        setStatus(error.message);
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setSelectionMode(false);
      setStatus("Selection mode cancelled");
    };

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.documentElement.style.cursor = "";
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [deviceUserId, environment, selectionMode, workspace]);

  const sendQuestion = async () => {
    if (!analysis || !question.trim()) {
      return;
    }

    setStatus("Generating answer...");
    try {
      const response = await apiClient.sendChat({
        deviceUserId,
        sessionId: analysis.sessionId,
        message: question.trim()
      });
      setChatAnswer(response);
      setQuestion("");
      setStatus("Answer ready");
      const sessions = await apiClient.listSessions(deviceUserId);
      setHistory(sessions.items);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Chat request failed");
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          right: drawerOpen ? 488 : 20,
          bottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 2147483646,
          transition: "right 180ms ease"
        }}
      >
        <button
          data-testid="c-pointer-launcher"
          onClick={() => setDrawerOpen((current) => !current)}
          style={{
            minHeight: 52,
            padding: "0 18px",
            borderRadius: 999,
            border: "1px solid rgba(165, 145, 152, 0.18)",
            background: "rgba(251, 249, 244, 0.96)",
            color: "var(--fortress-ink)",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 16px 42px rgba(60, 16, 30, 0.14)",
            cursor: "pointer",
            backdropFilter: "blur(12px)"
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: selectionMode ? "var(--fortress-primary)" : "rgba(165, 145, 152, 0.72)"
            }}
          />
          <span style={{ fontSize: 14, lineHeight: 1 }}>Code Inspector</span>
        </button>
        <button
          data-testid="c-pointer-picker"
          onClick={() => {
            setDrawerOpen(true);
            setSelectionMode((current) => !current);
            setStatus(selectionMode ? "Selection mode off" : "Selection mode on");
          }}
          style={{
            minHeight: 52,
            padding: "0 18px",
            borderRadius: 999,
            border: "none",
            background: "var(--fortress-primary)",
            color: "var(--fortress-surface)",
            boxShadow: "0 14px 32px rgba(210, 92, 27, 0.24)",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1
          }}
        >
          {selectionMode ? "Stop" : "Pick"}
        </button>
      </div>
      {selectionMode ? (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 2147483645,
              background: "rgba(60, 16, 30, 0.04)"
            }}
          />
          {hovered ? (
            <>
              <div
                style={{
                  position: "fixed",
                  top: hovered.rect.top - 4,
                  left: hovered.rect.left - 4,
                  width: hovered.rect.width + 8,
                  height: hovered.rect.height + 8,
                  border: hovered.dataInspPath ? "2px solid rgba(210, 92, 27, 0.92)" : "2px solid rgba(101, 0, 11, 0.72)",
                  borderRadius: 12,
                  background: hovered.dataInspPath ? "rgba(210, 92, 27, 0.08)" : "rgba(101, 0, 11, 0.08)",
                  pointerEvents: "none",
                  zIndex: 2147483646,
                  transition: "all 120ms ease"
                }}
              />
              <div
                style={{
                  position: "fixed",
                  top: Math.max(16, hovered.rect.top - 56),
                  left: Math.max(16, hovered.rect.left),
                  maxWidth: 440,
                  padding: "12px 14px",
                  borderRadius: 18,
                  border: "1px solid rgba(165, 145, 152, 0.18)",
                  background: "rgba(251, 249, 244, 0.95)",
                  color: "var(--fortress-ink)",
                  boxShadow: "0 16px 40px rgba(60, 16, 30, 0.12)",
                  pointerEvents: "none",
                  zIndex: 2147483647,
                  backdropFilter: "blur(12px)"
                }}
              >
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.9, color: "var(--fortress-muted)" }}>
                  {hovered.dataInspPath ? "Ready to inspect" : "Metadata missing"}
                </div>
                <div style={{ marginTop: 6, fontSize: 16, lineHeight: 1.2, fontFamily: "var(--fortress-font-heading)" }}>
                  {hovered.componentName || hovered.domTag}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, color: "var(--fortress-muted)" }}>
                  {hovered.filePath || "This element does not expose data-insp-path"}
                </div>
              </div>
            </>
          ) : null}
          <div
            style={{
              position: "fixed",
              left: 20,
              bottom: 20,
              width: 320,
              padding: "16px 18px",
              borderRadius: 22,
              background: "rgba(251, 249, 244, 0.96)",
              color: "var(--fortress-ink)",
              boxShadow: "0 16px 42px rgba(60, 16, 30, 0.14)",
              border: "1px solid rgba(165, 145, 152, 0.16)",
              zIndex: 2147483647
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--fortress-muted)" }}>
              Selection Mode
            </div>
            <div style={{ marginTop: 8, fontSize: 18, lineHeight: 1.2, fontFamily: "var(--fortress-font-heading)" }}>
              Click any component to inspect its source
            </div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: "var(--fortress-muted)" }}>
              Hover to preview the inspector path. Press Esc to cancel.
            </div>
          </div>
        </>
      ) : null}
      <Drawer
        open={drawerOpen}
        title={analysis?.component.name || "Code Inspector"}
        subtitle={`${workspace.toUpperCase()} · ${environment.toUpperCase()} · ${status}`}
        onClose={() => setDrawerOpen(false)}
      >
        <section
          style={{
            padding: 18,
            borderRadius: 28,
            background: "linear-gradient(180deg, rgba(244, 237, 232, 0.98) 0%, rgba(255, 255, 255, 0.86) 100%)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            border: "1px solid rgba(165, 145, 152, 0.14)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--fortress-muted)" }}>
                Inspector
              </div>
              <div style={{ marginTop: 6, fontSize: 22, lineHeight: 1.1, fontFamily: "var(--fortress-font-heading)" }}>
                {selectionMode ? "Component picker is active" : "Ready to inspect another component"}
              </div>
            </div>
            <PrimaryButton
              data-testid="c-pointer-select-button"
              onClick={() => {
                setDrawerOpen(true);
                setSelectionMode((current) => !current);
                setStatus(selectionMode ? "Selection mode off" : "Selection mode on");
              }}
              style={{ width: 180 }}
            >
              {selectionMode ? "Stop Selecting" : "Select Component"}
            </PrimaryButton>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--fortress-muted)" }}>
            The drawer mirrors a Cursor-style side panel. Start selection, hover the live page, and click a component with
            `data-insp-path` to inspect its source.
          </div>
          {hovered?.dataInspPath ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                alignSelf: "flex-start",
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.82)",
                border: "1px solid rgba(165, 145, 152, 0.18)",
                fontSize: 13,
                color: "var(--fortress-ink)"
              }}
            >
              {hovered.componentName} · {hovered.filePath}
            </div>
          ) : null}
        </section>

        {analysis ? (
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              padding: 18,
              borderRadius: 28,
              background: "var(--fortress-surface-elevated)",
              border: "1px solid rgba(165, 145, 152, 0.16)",
              boxShadow: "0 18px 40px rgba(60, 16, 30, 0.06)"
            }}
          >
            <div style={{ fontSize: 13, color: "var(--fortress-muted)" }}>Source context</div>
            <a
              href={analysis.component.githubUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(244, 237, 232, 0.9)",
                color: "var(--fortress-primary-dark)",
                textDecoration: "none",
                fontSize: 13
              }}
            >
              {analysis.component.filePath}:{analysis.component.line}
            </a>
            <div style={{ fontSize: 15, lineHeight: 1.65, color: "var(--fortress-ink)" }}>{analysis.analysis.summary}</div>
            {analysis.analysis.displayContent.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {analysis.analysis.displayContent.map((item) => (
                  <div
                    key={item}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.86)",
                      border: "1px solid rgba(165, 145, 152, 0.14)",
                      fontSize: 14,
                      lineHeight: 1.5
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : (
          <section
            style={{
              padding: 20,
              borderRadius: 28,
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(165, 145, 152, 0.12)",
              color: "var(--fortress-muted)",
              fontSize: 14,
              lineHeight: 1.6
            }}
          >
            No component selected yet. Use the selector to capture a live component from the page.
          </section>
        )}

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 18,
            borderRadius: 28,
            background: "rgba(255,255,255,0.84)",
            border: "1px solid rgba(165, 145, 152, 0.14)"
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--fortress-muted)" }}>
            Follow-up
          </div>
          <div style={{ fontSize: 18, lineHeight: 1.2, fontFamily: "var(--fortress-font-heading)" }}>
            Continue the conversation
          </div>
          <TextInput
            data-testid="c-pointer-followup-input"
            placeholder="Ask about APIs, state changes, downstream impact..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <PrimaryButton
            data-testid="c-pointer-send-question"
            fullWidth
            onClick={() => void sendQuestion()}
            disabled={!analysis || !question.trim()}
          >
            Send Question
          </PrimaryButton>
          {chatAnswer ? (
            <div
              style={{
                padding: 16,
                borderRadius: 22,
                border: "1px solid rgba(165, 145, 152, 0.18)",
                background: "rgba(244, 237, 232, 0.7)"
              }}
            >
              <div style={{ fontSize: 16, lineHeight: 1.3, color: "var(--fortress-ink)" }}>{chatAnswer.answer.summary}</div>
              <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.65, color: "var(--fortress-muted)" }}>
                {chatAnswer.answer.details}
              </div>
            </div>
          ) : null}
        </section>

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: 18,
            borderRadius: 28,
            background: "rgba(255,255,255,0.68)",
            border: "1px solid rgba(165, 145, 152, 0.12)"
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--fortress-muted)" }}>
            Recent sessions
          </div>
          {history.length ? history.slice(0, 6).map((item) => (
            <div
              key={item.sessionId}
              style={{
                padding: 14,
                borderRadius: 20,
                background: "rgba(251,249,244,0.9)",
                border: "1px solid rgba(165, 145, 152, 0.12)",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}
            >
              <div style={{ fontSize: 15, color: "var(--fortress-ink)" }}>{item.componentName}</div>
              <div style={{ fontSize: 12, color: "var(--fortress-muted)" }}>{formatSessionLabel(item)}</div>
            </div>
          )) : (
            <div style={{ fontSize: 14, color: "var(--fortress-muted)" }}>No saved sessions on this device yet.</div>
          )}
        </section>
      </Drawer>
    </>
  );
}

function mount() {
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const container = document.createElement("div");
  container.id = ROOT_ID;
  document.documentElement.appendChild(container);

  const shadowRoot = container.attachShadow({ mode: "open" });
  const styleTag = document.createElement("style");
  styleTag.textContent = fortressCss;
  shadowRoot.appendChild(styleTag);

  const mountPoint = document.createElement("div");
  shadowRoot.appendChild(mountPoint);

  ReactDOM.createRoot(mountPoint).render(<App />);
}

mount();
