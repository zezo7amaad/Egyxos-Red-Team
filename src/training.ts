export interface TrainingModule {
  name: string;
  objective: string;
  practices: string[];
}

export const authorizedSecurityCurriculum: TrainingModule[] = [
  {
    name: "authorization-and-scope",
    objective: "Keep every assessment within written authorization and configured scope.",
    practices: [
      "Confirm the target, asset, environment, and allowed test categories before acting.",
      "Reject out-of-scope hosts, accounts, data, and techniques.",
      "Prefer owned test accounts and synthetic records.",
      "Stop when authorization or scope is ambiguous.",
    ],
  },
  {
    name: "reconnaissance",
    objective: "Build an accurate attack-surface inventory with the least-impactful methods first.",
    practices: [
      "Start with passive discovery and identify technologies, hosts, endpoints, and APIs.",
      "Deduplicate observations and record source, timestamp, and confidence.",
      "Use rate limits and avoid broad enumeration unless the program explicitly permits it.",
      "Do not treat a discovered asset as authorized until scope confirms it.",
    ],
  },
  {
    name: "web-and-api-analysis",
    objective: "Form testable hypotheses from observed behavior before active validation.",
    practices: [
      "Review authentication, authorization, input handling, sessions, CORS, headers, and error handling.",
      "For BOLA/IDOR, use two authorized test accounts and synthetic records.",
      "Use one controlled read-only comparison before considering broader testing.",
      "Never access real users' private data or attempt state-changing actions without approval.",
    ],
  },
  {
    name: "validation-and-evidence",
    objective: "Separate observations from confirmed vulnerabilities and preserve reproducible evidence.",
    practices: [
      "Record sanitized requests, responses, timestamps, and account roles.",
      "Require a repeatable difference that demonstrates security impact.",
      "Assign confidence honestly as potential, likely, or confirmed.",
      "Do not infer exploitability from status codes alone.",
    ],
  },
  {
    name: "input-validation",
    objective: "Assess XSS and SQL injection hypotheses with harmless inputs and explicit approval.",
    practices: [
      "For XSS, use inert markers first and verify reflection context, encoding, storage, and execution separately.",
      "For SQL injection, compare controlled responses and errors without extracting data or changing state.",
      "Require approval before active payloads, automated scanners, or timing-based tests.",
      "Stop immediately if testing could affect real users, records, availability, or data integrity.",
    ],
  },
  {
    name: "dns-and-service-ownership",
    objective: "Assess possible subdomain takeover conditions without claiming third-party infrastructure.",
    practices: [
      "Resolve the complete CNAME chain and record provider-specific HTTP error evidence.",
      "Verify that the referenced resource is unassigned before escalating the hypothesis.",
      "Do not create or claim provider resources, change DNS, or serve content without explicit written approval.",
      "Distinguish dangling DNS, provider misconfiguration, and confirmed takeover capability.",
    ],
  },
  {
    name: "reporting-and-remediation",
    objective: "Produce clear, actionable reports for authorized programs.",
    practices: [
      "Include title, affected asset, prerequisites, reproduction, impact, evidence, severity, and remediation.",
      "Avoid inflated severity and distinguish privacy exposure from account compromise.",
      "Recommend server-side controls, least privilege, validation, logging, and regression tests.",
      "Redact credentials, tokens, personal data, and unnecessary payloads.",
    ],
  },
];

export function renderSecurityCurriculum(): string {
  return authorizedSecurityCurriculum
    .map((module) => [
      `Module: ${module.name}`,
      `Objective: ${module.objective}`,
      ...module.practices.map((practice) => `- ${practice}`),
    ].join("\n"))
    .join("\n\n");
}
