import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import type { AnalysisResponse, ChatResponse, SessionListItem, WorkspaceName } from "@c-pointer/shared";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextInput } from "../components/TextInput";
import { Drawer } from "../components/Drawer";
import { apiClient } from "../services/apiClient";
import { fortressCss } from "./styles";

const ROOT_ID = "c-pointer-root";
const SAMPLE_PATH = "libs/modules/cart/components/src/lib/pos-add-service-items/pos-add-service-items.tsx:119:7:Button";

function inferWorkspace(): WorkspaceName {
  return window.location.hostname.includes("pos-") ? "pos" : "web";
}

function inferEnvironment() {
  return window.location.hostname.includes("localhost") ? "local" as const : "test" as const;
}

function detectInspectorPath(target: HTMLElement | null): string {
  let current = target;
  let depth = 0;
  while (current && depth < 8) {
    const direct = current.getAttribute("data-insp-path");
    if (direct) {
      return direct;
    }
    current = current.parentElement;
    depth += 1;
  }
  return SAMPLE_PATH;
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

  const workspace = useMemo(() => inferWorkspace(), []);
  const environment = useMemo(() => inferEnvironment(), []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_DEVICE_USER_ID" }, (response) => {
      if (response?.deviceUserId) {
        setDeviceUserId(response.deviceUserId);
        void apiClient.listSessions(response.deviceUserId).then((result) => {
          setHistory(result.items);
        }).catch(() => undefined);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectionMode) {
      return;
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setStatus("Analyzing selected component...");
      setDrawerOpen(true);
      setSelectionMode(false);

      void apiClient.createSession({
        deviceUserId,
        workspace,
        environment,
        pageUrl: window.location.href,
        selection: {
          dataInspPath: detectInspectorPath(target),
          selectedText: target.textContent?.trim().slice(0, 80),
          domTag: target.tagName.toLowerCase()
        },
        options: {
          analysisDepth: "standard",
          includeRelatedFiles: true
        }
      }).then((result) => {
        setAnalysis(result);
        setStatus("Analysis ready");
        return apiClient.listSessions(deviceUserId);
      }).then((result) => {
        setHistory(result.items);
      }).catch((error: Error) => {
        setStatus(error.message);
      });
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, [deviceUserId, environment, selectionMode, workspace]);

  useEffect(() => {
    const listener = (message: { type?: string }) => {
      if (message.type === "TOGGLE_ANALYZER") {
        setDrawerOpen(true);
        setSelectionMode((current) => !current);
        setStatus("Selection mode toggled");
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const sendQuestion = async () => {
    if (!analysis || !question.trim()) {
      return;
    }

    setStatus("Generating answer...");
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
  };

  return (
    <>
      {selectionMode ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 2147483646,
            border: "2px dashed rgba(210, 92, 27, 0.45)"
          }}
        />
      ) : null}
      <Drawer
        open={drawerOpen}
        title="C-Pointer"
        subtitle={`${workspace.toUpperCase()} · ${environment.toUpperCase()} · ${status}`}
        onClose={() => setDrawerOpen(false)}
      >
        <section
          style={{
            padding: 20,
            borderRadius: 24,
            background: "var(--fortress-surface-muted)",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <div style={{ fontSize: 20, color: "var(--fortress-ink)", fontFamily: "var(--fortress-font-heading)" }}>
            Select and inspect
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.4, color: "var(--fortress-muted)" }}>
            Toggle selection mode, click any component, and the drawer will fetch mocked analysis through the backend.
          </div>
          <PrimaryButton
            fullWidth
            onClick={() => {
              setDrawerOpen(true);
              setSelectionMode((current) => !current);
              setStatus(selectionMode ? "Selection mode off" : "Selection mode on");
            }}
          >
            {selectionMode ? "Stop Selecting" : "Select Component"}
          </PrimaryButton>
        </section>

        {analysis ? (
          <section
            style={{
              padding: 20,
              borderRadius: 24,
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(165, 145, 152, 0.18)",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", color: "var(--fortress-muted)", letterSpacing: 1 }}>
              Selected component
            </div>
            <div style={{ fontSize: 24, color: "var(--fortress-ink)", fontFamily: "var(--fortress-font-heading)" }}>
              {analysis.component.name}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--fortress-ink)" }}>
              {analysis.analysis.summary}
            </div>
            <a
              href={analysis.component.githubUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--fortress-primary-dark)", textDecoration: "none", fontSize: 14 }}
            >
              Open GitHub source
            </a>
          </section>
        ) : null}

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <div style={{ fontSize: 18, color: "var(--fortress-ink)", fontFamily: "var(--fortress-font-heading)" }}>
            Follow-up question
          </div>
          <TextInput
            placeholder="Ask about APIs, state, or impact..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <PrimaryButton fullWidth onClick={() => void sendQuestion()} disabled={!analysis}>
            Send Question
          </PrimaryButton>
          {chatAnswer ? (
            <div
              style={{
                padding: 16,
                borderRadius: 20,
                border: "1px solid rgba(165, 145, 152, 0.24)",
                background: "#fff"
              }}
            >
              <div style={{ fontSize: 16, color: "var(--fortress-ink)" }}>{chatAnswer.answer.summary}</div>
              <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "var(--fortress-muted)" }}>
                {chatAnswer.answer.details}
              </div>
            </div>
          ) : null}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 18, color: "var(--fortress-ink)", fontFamily: "var(--fortress-font-heading)" }}>
            Recent sessions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.length ? history.slice(0, 5).map((item) => (
              <div
                key={item.sessionId}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  background: "#fff",
                  border: "1px solid rgba(165, 145, 152, 0.18)"
                }}
              >
                <div style={{ fontSize: 16, color: "var(--fortress-ink)" }}>{item.componentName}</div>
                <div style={{ fontSize: 12, color: "var(--fortress-muted)", marginTop: 4 }}>
                  {item.workspace.toUpperCase()} · {item.environment.toUpperCase()}
                </div>
              </div>
            )) : (
              <div style={{ fontSize: 14, color: "var(--fortress-muted)" }}>No sessions yet.</div>
            )}
          </div>
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
