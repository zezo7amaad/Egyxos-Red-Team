import { spawnSync } from "node:child_process";
import { validateTarget } from "./scope.js";
import type { ToolCategory, ToolDefinition } from "./types.js";

export const toolCatalog: ToolDefinition[] = [
  { name: "httpx", category: "recon", description: "HTTP service discovery and fingerprinting", enabled: true, requiresApproval: false },
  { name: "katana", category: "recon", description: "Crawler and endpoint discovery", enabled: true, requiresApproval: false },
  { name: "ffuf", category: "web", description: "Directory and endpoint fuzzing", enabled: true, requiresApproval: true },
  { name: "sqlmap", category: "api", description: "SQL injection assessment", enabled: false, requiresApproval: true },
  { name: "nmap", category: "recon", description: "Port and service scanning", enabled: true, requiresApproval: true },
  { name: "nuclei", category: "web", description: "Vulnerability templated checks", enabled: true, requiresApproval: true },
  { name: "subfinder", category: "recon", description: "Passive subdomain discovery", enabled: true, requiresApproval: false },
  { name: "curl", category: "web", description: "HTTP request generation", enabled: true, requiresApproval: false },
  { name: "dig", category: "recon", description: "DNS queries", enabled: true, requiresApproval: false },
  { name: "whois", category: "recon", description: "Ownership and domain lookup", enabled: true, requiresApproval: false },
];

export function getToolRegistry(): ToolDefinition[] {
  return toolCatalog.map((tool) => ({ ...tool }));
}

export function buildToolCommand(toolName: string, target: string, mode = "active"): string {
  switch (toolName) {
    case "httpx":
      return `httpx -u "${target}" -silent -title`;
    case "katana":
      return `katana -u "${target}" -silent`;
    case "ffuf":
      return `ffuf -u "${target}/FUZZ" -w /tmp/paths.txt -s`;
    case "sqlmap":
      return `sqlmap -u "${target}" --batch --smart`;
    case "nmap":
      return `nmap -sV -T3 "${target}"`;
    case "nuclei":
      return `nuclei -u "${target}" -v -severity medium,high,critical -jsonl`;
    case "subfinder":
      return `subfinder -d "${target}" -silent`;
    case "curl":
      return `curl -sSIL "${target}"`;
    case "dig":
      return `dig +short "${target}"`;
    case "whois":
      return `whois "${target}"`;
    default:
      return `${toolName} "${target}" --mode ${mode}`;
  }
}

export function isToolAvailable(toolName: string): boolean {
  const command = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(command, [toolName], { encoding: "utf8" });
  return result.status === 0;
}

export function previewAction(toolName: string, target: string, scope: string[], dryRun = false): {
  tool: string;
  allowed: boolean;
  requiresApproval: boolean;
  preview: string;
} {
  const tool = getToolRegistry().find((entry) => entry.name === toolName) ?? {
    name: toolName,
    enabled: true,
    requiresApproval: false,
  };

  const validation = validateTarget(target, scope);
  const preview = buildToolCommand(toolName, target, dryRun ? "preview" : "active");

  return {
    tool: tool.name,
    allowed: validation.ok,
    requiresApproval: tool.requiresApproval,
    preview,
  };
}
