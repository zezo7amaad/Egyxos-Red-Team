export type Severity = "informational" | "low" | "medium" | "high" | "critical";
export type Confidence = "potential" | "likely" | "confirmed";
export type ToolCategory = "recon" | "web" | "api" | "analysis" | "reporting";
export type SessionStatus = "active" | "paused" | "completed";

export interface ToolDefinition {
  name: string;
  category: ToolCategory;
  description: string;
  enabled: boolean;
  requiresApproval: boolean;
}

export interface ProjectRecord {
  name: string;
  path: string;
  createdAt: string;
  lastOpenAt: string;
  scope: string[];
}

export interface SessionRecord {
  id: string;
  objective: string;
  target: string;
  scope: string[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  history: string[];
  approvals: ApprovalRequest[];
}

export interface ApprovalRequest {
  id: string;
  tool: string;
  target: string;
  scope: string[];
  reason: string;
  status: "pending" | "approved" | "denied";
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  confidence: Confidence;
  target: string;
  endpoint: string;
  description: string;
  impact: string;
  evidence: string[];
  reproduction: string[];
  remediation: string;
  references: string[];
  status: "potential" | "suspected" | "confirmed" | "false_positive";
}

export interface EvidenceRecord {
  id: string;
  type: string;
  source: string;
  detail: string;
  timestamp: string;
}

export interface DoctorCheck {
  name: string;
  ok: boolean;
  details: string;
}
