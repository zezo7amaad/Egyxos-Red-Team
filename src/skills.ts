export type SkillPermission = "passive" | "approval_required" | "reporting";
import { renderSecurityCurriculum } from "./training.js";

export interface SecuritySkill {
  name: string;
  description: string;
  category: "reconnaissance" | "web" | "api" | "analysis" | "reporting";
  permissions: SkillPermission[];
  requiredTools: string[];
  instructions: string[];
}

export const securitySkills: SecuritySkill[] = [
  {
    name: "bug-bounty-triage",
    description: "Triage authorized observations into testable vulnerability hypotheses.",
    category: "analysis",
    permissions: ["passive", "reporting"],
    requiredTools: [],
    instructions: [
      "Use only assets and evidence inside the configured program scope.",
      "Separate observations, hypotheses, and confirmed findings.",
      "Do not claim exploitability without reproducible evidence.",
      "Prefer low-impact validation and request approval before active testing.",
    ],
  },
  {
    name: "passive-asset-discovery",
    description: "Organize passive subdomain and service-discovery results.",
    category: "reconnaissance",
    permissions: ["passive"],
    requiredTools: ["subfinder", "httpx"],
    instructions: [
      "Enumerate only the approved root domains.",
      "Deduplicate and classify discovered hosts.",
      "Do not probe or scan hosts outside the approved scope.",
    ],
  },
  {
    name: "web-exposure-review",
    description: "Review authorized web observations for common security weaknesses.",
    category: "web",
    permissions: ["passive", "approval_required", "reporting"],
    requiredTools: ["curl", "nuclei"],
    instructions: [
      "Review headers, exposed files, authentication boundaries, and error behavior.",
      "Use read-only requests by default.",
      "Require explicit approval for fuzzing, authentication testing, or state-changing requests.",
    ],
  },
  {
    name: "api-review",
    description: "Analyze authorized API documentation, requests, and responses.",
    category: "api",
    permissions: ["passive", "approval_required", "reporting"],
    requiredTools: ["curl"],
    instructions: [
      "Map documented endpoints and authentication requirements.",
      "Look for authorization inconsistencies and unsafe data exposure.",
      "Do not test other users, accounts, or records without explicit program permission.",
    ],
  },
  {
    name: "finding-report-writer",
    description: "Turn validated evidence into a concise bug bounty report.",
    category: "reporting",
    permissions: ["reporting"],
    requiredTools: [],
    instructions: [
      "Include title, impact, affected asset, reproduction, evidence, severity, and remediation.",
      "Use confirmed, likely, or potential confidence accurately.",
      "Never invent requests, responses, screenshots, or exploit results.",
    ],
  },
];

export function getSecuritySkills(): SecuritySkill[] {
  return securitySkills.map((skill) => ({
    ...skill,
    permissions: [...skill.permissions],
    requiredTools: [...skill.requiredTools],
    instructions: [...skill.instructions],
  }));
}

export function getSecuritySkill(name: string): SecuritySkill {
  const skill = securitySkills.find((entry) => entry.name === name);
  if (!skill) {
    throw new Error(`Unknown skill '${name}'. Run 'egyxos-redteam skills list'.`);
  }

  return skill;
}

export function buildSkillPrompt(skillName: string, userRequest: string): string {
  const skill = getSecuritySkill(skillName);
  return [
    `You are EGYXOS Red Team operating under the "${skill.name}" skill.`,
    "This is an authorized security assessment. Stay within the configured scope.",
    "Provide concise operational reasoning, not hidden chain-of-thought.",
    "Do not perform or recommend destructive actions, credential theft, persistence, or out-of-scope testing.",
    `Skill purpose: ${skill.description}`,
    `Required tools: ${skill.requiredTools.join(", ") || "none"}`,
    "Safety rules:",
    ...skill.instructions.map((instruction) => `- ${instruction}`),
    "",
    "Authorized security curriculum:",
    renderSecurityCurriculum(),
    "",
    `Operator request: ${userRequest}`,
  ].join("\n");
}
