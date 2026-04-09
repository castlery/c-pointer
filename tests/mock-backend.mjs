import http from "node:http";

const port = 3012;
const sessions = new Map();

function json(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer((request, response) => {
  if (!request.url) {
    json(response, 404, { code: "NOT_FOUND" });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/v1/health") {
    json(response, 200, {
      status: "ok",
      checks: {
        github: "ok",
        openai: "ok",
        historyStore: "ok"
      }
    });
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/v1/history/sessions")) {
    const url = new URL(request.url, "http://127.0.0.1");
    const deviceUserId = url.searchParams.get("device_user_id");
    const items = Array.from(sessions.values())
      .filter((session) => session.deviceUserId === deviceUserId)
      .map((session) => session.listItem)
      .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));

    json(response, 200, { items });
    return;
  }

  const chunks = [];
  request.on("data", (chunk) => {
    chunks.push(chunk);
  });

  request.on("end", () => {
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};

    if (request.method === "POST" && request.url === "/v1/analysis/sessions") {
      const sessionId = "sess_fixture";
      const lastMessageAt = new Date().toISOString();
      const payload = {
        sessionId,
        snapshotId: "snap_fixture",
        component: {
          name: "Button",
          filePath: "libs/modules/cart/components/src/lib/pos-add-service-items/pos-add-service-items.tsx",
          line: 119,
          column: 7,
          workspace: body.workspace,
          environment: body.environment,
          repo: "castlery/joyboy",
          branch: "develop",
          commitSha: "fixture-sha",
          confidence: "high",
          githubUrl: "https://github.com/castlery/joyboy/blob/develop/libs/modules/cart/components/src/lib/pos-add-service-items/pos-add-service-items.tsx#L119"
        },
        analysis: {
          summary: "Button is the POS entry point for adding service items to cart.",
          displayContent: [
            "Shows an add-service-item entry action.",
            `Selected text: ${body.selection?.selectedText || "Add service item"}`
          ],
          interactions: [
            {
              action: "Click button",
              effect: "Opens the service item workflow."
            }
          ],
          states: [
            {
              name: "default",
              description: "Ready for user interaction."
            }
          ],
          dependencies: [
            {
              filePath: "libs/modules/cart/services/src/lib/cart-service.ts",
              role: "service"
            }
          ],
          evidence: {
            targetFilePath: "libs/modules/cart/components/src/lib/pos-add-service-items/pos-add-service-items.tsx",
            relatedFiles: [
              "libs/modules/cart/services/src/lib/cart-service.ts"
            ],
            confidence: "high"
          }
        }
      };

      sessions.set(sessionId, {
        deviceUserId: body.deviceUserId,
        listItem: {
          sessionId,
          componentName: payload.component.name,
          workspace: body.workspace,
          environment: body.environment,
          pageUrl: body.pageUrl,
          lastMessageAt
        }
      });

      json(response, 200, payload);
      return;
    }

    if (request.method === "POST" && request.url === "/v1/chat/messages") {
      const payload = {
        sessionId: body.sessionId,
        messageId: "msg_fixture",
        answer: {
          summary: "The button depends on cart-service and mutates POS cart state.",
          details: `Follow-up analyzed for: "${body.message}"`,
          evidence: {
            targetFilePath: "libs/modules/cart/components/src/lib/pos-add-service-items/pos-add-service-items.tsx",
            relatedFiles: [
              "libs/modules/cart/services/src/lib/cart-service.ts"
            ],
            confidence: "high"
          }
        },
        summaryUpdated: true
      };

      json(response, 200, payload);
      return;
    }

    json(response, 404, { code: "NOT_FOUND" });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[mock-backend] listening on http://127.0.0.1:${port}`);
});
