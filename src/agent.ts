import type { ApprovalRequest } from "./types.js";

export type AgentPhase = "understand" | "plan" | "approve" | "execute" | "observe" | "report" | "blocked";

export class AgentController {
  phase: AgentPhase;
  objective: string;
  target: string;
  pendingApproval?: ApprovalRequest;

  constructor(objective: string, target: string) {
    this.phase = "understand";
    this.objective = objective;
    this.target = target;
  }

  planAction(action: string, target = this.target): { phase: AgentPhase; objective: string; target: string } {
    this.phase = "plan";
    this.objective = action;
    this.target = target;

    return {
      phase: this.phase,
      objective: this.objective,
      target: this.target,
    };
  }

  requestApproval(tool: string, target: string, scope: string[], reason: string): ApprovalRequest {
    this.phase = "approve";
    this.pendingApproval = {
      id: `approval-${Date.now()}`,
      tool,
      target,
      scope,
      reason,
      status: "pending",
    };

    return this.pendingApproval;
  }

  approveRequest(approved: boolean): boolean {
    if (!this.pendingApproval) {
      return false;
    }

    this.pendingApproval.status = approved ? "approved" : "denied";
    this.phase = approved ? "execute" : "blocked";
    return approved;
  }

  summarize(): string {
    return [
      "Agent status:",
      `Objective: ${this.objective}`,
      `Target: ${this.target}`,
      `Phase: ${this.phase}`,
    ].join("\n");
  }
}
