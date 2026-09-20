import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ensureProject } from "./project.js";
import { validateTarget } from "./scope.js";

export interface ScanOutput {
  target: string;
  subdomains: string;
  httpx: string;
  nuclei: string;
}

function readTimeout(name: string, fallbackMs: number): number {
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) && configured > 0 ? configured : fallbackMs;
}

function isTimeoutError(error: Error): error is NodeJS.ErrnoException {
  return "code" in error && error.code === "ETIMEDOUT";
}

function runBinary(binary: string, args: string[], timeoutMs: number, label = binary): string {
  const result = spawnSync(binary, args, {
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
  });

  if (result.error) {
    if (isTimeoutError(result.error)) {
      throw new Error(
        `${label} exceeded its ${Math.round(timeoutMs / 1000)} second timeout. `
        + `Increase ${binary === "nuclei" ? "EGYXOS_NUCLEI_TIMEOUT_MS" : "EGYXOS_TOOL_TIMEOUT_MS"} `
        + "or reduce the authorized target set.",
      );
    }

    throw new Error(`${binary} could not run: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().slice(0, 1_000);
    throw new Error(`${binary} exited with status ${result.status}${detail ? `: ${detail}` : "."}`);
  }

  return result.stdout.trim();
}

function runHttpx(targetFile: string): string {
  const timeoutMs = readTimeout("EGYXOS_TOOL_TIMEOUT_MS", 120_000);
  const result = spawnSync("httpx", ["-l", targetFile, "-silent", "-title"], {
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
  });

  if (result.error) {
    if (isTimeoutError(result.error)) {
      throw new Error(`ProjectDiscovery httpx exceeded its ${Math.round(timeoutMs / 1000)} second timeout. Increase EGYXOS_TOOL_TIMEOUT_MS or reduce the authorized target set.`);
    }

    throw new Error(`ProjectDiscovery httpx could not run: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().slice(0, 1_000);
    if (detail.includes("No such option: -l") || detail.includes("Usage: httpx [OPTIONS] URL")) {
      throw new Error(
        "The installed 'httpx' is the Python HTTP client CLI, not ProjectDiscovery httpx. "
        + "Install ProjectDiscovery httpx and ensure its binary appears first on PATH.",
      );
    }

    throw new Error(`ProjectDiscovery httpx exited with status ${result.status}${detail ? `: ${detail}` : "."}`);
  }

  return result.stdout.trim();
}

function updateNucleiTemplates(): string {
  return runBinary(
    "nuclei",
    ["-update-templates"],
    readTimeout("EGYXOS_NUCLEI_TEMPLATE_TIMEOUT_MS", 300_000),
    "Nuclei template update",
  );
}

export function runAuthorizedScan(
  target: string,
  options: { projectName?: string; storageRoot?: string; approveActive: boolean },
): ScanOutput {
  const project = ensureProject(options.projectName, options.storageRoot);
  const validation = validateTarget(target, project.scope);
  if (!validation.ok) {
    throw new Error(validation.reason ?? "Target is outside the configured scope.");
  }

  if (!options.approveActive) {
    throw new Error("Nuclei is an active security check. Re-run with --approve to authorize it.");
  }

  const host = validation.host ?? target;
  const subdomains = runBinary("subfinder", ["-d", host, "-silent"], readTimeout("EGYXOS_TOOL_TIMEOUT_MS", 120_000));
  const targets = subdomains.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  if (!targets.includes(host)) {
    targets.unshift(host);
  }

  const tempFile = path.join(os.tmpdir(), `egyxos-targets-${Date.now()}.txt`);
  fs.writeFileSync(tempFile, `${targets.join("\n")}\n`);

  try {
    updateNucleiTemplates();
    const httpx = runHttpx(tempFile);
    const nuclei = runBinary("nuclei", [
      "-l",
      tempFile,
      "-v",
      "-severity",
      "info,low,medium,high,critical",
      "-jsonl",
    ], readTimeout("EGYXOS_NUCLEI_TIMEOUT_MS", 600_000), "Nuclei");

    return { target: host, subdomains, httpx, nuclei };
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}
