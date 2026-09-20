import { spawnSync } from "node:child_process";
import { loadConfig, resolveStoragePath } from "./config.js";
import type { DoctorCheck } from "./types.js";

function commandExists(tool: string): boolean {
  const cmd = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(cmd, [tool], { encoding: "utf8" });
  return result.status === 0;
}

export function runDoctor(): { status: string; checks: DoctorCheck[] } {
  const config = loadConfig();
  const checks: DoctorCheck[] = [
    { name: "Runtime", ok: Boolean(process.version), details: `Node ${process.version}` },
    { name: "Database", ok: true, details: `Storage root: ${resolveStoragePath()}` },
    { name: "Configuration", ok: Boolean(config), details: `Project: ${config.project}` },
    { name: "AI Provider", ok: Boolean(config.provider), details: `Provider: ${config.provider}` },
    { name: "httpx", ok: commandExists("httpx"), details: commandExists("httpx") ? "Installed" : "Missing: install httpx for recon" },
    { name: "katana", ok: commandExists("katana"), details: commandExists("katana") ? "Installed" : "Missing: install katana for crawling" },
    { name: "ffuf", ok: commandExists("ffuf"), details: commandExists("ffuf") ? "Installed" : "Missing: install ffuf for fuzzing" },
  ];

  const failing = checks.filter((check) => !check.ok).length;
  return {
    status: failing > 0 ? "READY WITH WARNINGS" : "READY",
    checks,
  };
}
