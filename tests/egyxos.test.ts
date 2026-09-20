import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { AgentController } from "../src/agent.js";
import { addScope, createProject, listProjects } from "../src/project.js";
import { renderJsonReport } from "../src/reporting.js";
import { validateTarget } from "../src/scope.js";
import { runDoctor } from "../src/doctor.js";
import { getToolRegistry } from "../src/tooling.js";
import { DatabaseService } from "../src/database.js";

const originalStorage = process.env.EGYXOS_STORAGE;

beforeEach(() => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "egyxos-test-"));
  process.env.EGYXOS_STORAGE = temp;
});

describe("EGYXOS Red Team core behaviors", () => {
  it("creates a project and enforces scope", () => {
    const project = createProject("demo");
    addScope("example.com", "demo");
    const allowed = validateTarget("https://api.example.com", ["example.com"]);
    const blocked = validateTarget("https://evil.example.net", ["example.com"]);

    expect(project.name).toBe("demo");
    expect(listProjects().some((entry) => entry.name === "demo")).toBe(true);
    expect(allowed.ok).toBe(true);
    expect(blocked.ok).toBe(false);
  });

  it("requires approval for dangerous actions", () => {
    const controller = new AgentController("Map API attack surface", "https://example.com");
    const approval = controller.requestApproval("ffuf", "https://example.com", ["example.com"], "Fuzz API endpoints");

    expect(approval.status).toBe("pending");
    expect(controller.approveRequest(true)).toBe(true);
    expect(controller.phase).toBe("execute");
  });

  it("lists available tools and renders JSON reports", () => {
    const tools = getToolRegistry();
    const report = renderJsonReport([
      {
        id: "EGYXOS-001",
        title: "Example Finding",
        severity: "high",
        confidence: "confirmed",
        target: "https://example.com",
        endpoint: "/api/example",
        description: "Sample finding for validation.",
        impact: "Unauthorized access could be possible.",
        evidence: ["HTTP response 200"],
        reproduction: ["Issue reproduced against the endpoint"],
        remediation: "Fix request validation.",
        references: ["https://example.com/docs"],
        status: "confirmed",
      },
    ]);

    expect(tools.some((tool) => tool.name === "httpx")).toBe(true);
    expect(report).toContain("EGYXOS-001");
  });

  it("runs a doctor check suite", () => {
    const result = runDoctor();
    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.status).toBeDefined();
  });

  it("stores event logs in SQLite", async () => {
    const db = new DatabaseService();
    await db.createProject("persisted", "C:/tmp/persisted");
    await db.logEvent("tool.started", { tool: "httpx", target: "https://example.com", password: "secret" });
    const events = await db.getEventLog();
    expect(events.some((event) => event.event_name === "tool.started")).toBe(true);
    expect(events[0].payload).toContain("[redacted]");
    await db.close();
  });
});

process.env.EGYXOS_STORAGE = originalStorage ?? "";
