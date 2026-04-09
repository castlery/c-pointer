import { useEffect, useState } from "react";
import { PrimaryButton } from "../components/PrimaryButton";
import { apiClient } from "../services/apiClient";

export function App() {
  const [health, setHealth] = useState("Checking backend...");

  useEffect(() => {
    void apiClient.health().then((response) => {
      setHealth(`Backend ${response.status} · GitHub ${response.checks.github} · OpenAI ${response.checks.openai}`);
    }).catch(() => {
      setHealth("Backend unavailable");
    });
  }, []);

  const toggleAnalyzer = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return;
    }

    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_ANALYZER" });
    window.close();
  };

  return (
    <div
      style={{
        width: 320,
        padding: 24,
        background: "#FBF9F4",
        color: "#3C101E",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "Georgia, serif"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 28, lineHeight: 1, fontFamily: "Iowan Old Style, serif" }}>C-Pointer</div>
        <div style={{ fontSize: 14, lineHeight: 1.4, color: "#A59198" }}>
          Cursor-style side panel for Castlery Web and POS test environments.
        </div>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 20,
          background: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(165, 145, 152, 0.22)",
          fontSize: 13,
          lineHeight: 1.45
        }}
      >
        {health}
      </div>

      <PrimaryButton fullWidth onClick={() => void toggleAnalyzer()}>
        Start Component Selection
      </PrimaryButton>
    </div>
  );
}
