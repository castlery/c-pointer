import type {
  AnalysisRequest,
  AnalysisResponse,
  ChatRequest,
  ChatResponse,
  HealthResponse,
  SessionDetailResponse,
  SessionListResponse
} from "@c-pointer/shared";

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

class ApiClient {
  private baseUrl = DEFAULT_BASE_URL;

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async health(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/v1/health`);
    if (!response.ok) {
      throw new Error("Health request failed");
    }
    return response.json();
  }

  async createSession(payload: AnalysisRequest): Promise<AnalysisResponse> {
    const response = await fetch(`${this.baseUrl}/v1/analysis/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Analysis request failed");
    }

    return response.json();
  }

  async sendChat(payload: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Chat request failed");
    }

    return response.json();
  }

  async listSessions(deviceUserId: string): Promise<SessionListResponse> {
    const response = await fetch(`${this.baseUrl}/v1/history/sessions?device_user_id=${encodeURIComponent(deviceUserId)}`);
    if (!response.ok) {
      throw new Error("Session list request failed");
    }

    return response.json();
  }

  async getSession(sessionId: string, deviceUserId: string): Promise<SessionDetailResponse> {
    const response = await fetch(
      `${this.baseUrl}/v1/history/sessions/${sessionId}?device_user_id=${encodeURIComponent(deviceUserId)}`
    );

    if (!response.ok) {
      throw new Error("Session detail request failed");
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
