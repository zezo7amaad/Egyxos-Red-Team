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

function runBinary(binary: string, args: string[]): string {
  const result = spawnSync(binary, args, {
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`${binary} could not run: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().slice(0, 1_000);
    throw new Error(`${binary} exited with status ${result.status}${detail ? `: ${detail}` : "."}`);
  }

  return result.stdout.trim();
}

function runHttpx(targetFile: string): string {
  const result = spawnSync("httpx", ["-l", targetFile, "-silent", "-title"], {
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
  });

  if (result.error) {
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
  const subdomains = runBinary("subfinder", ["-d", host, "-silent"]);
  const targets = subdomains.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  if (!targets.includes(host)) {
    targets.unshift(host);
  }

  const tempFile = path.join(os.tmpdir(), `egyxos-targets-${Date.now()}.txt`);
  fs.writeFileSync(tempFile, `${targets.join("\n")}\n`);

  try {
    const httpx = runHttpx(tempFile);
    const nuclei = runBinary("nuclei", [
      "-l",
      tempFile,
      "-v",
      "-severity",
      "info,low,medium,high,critical",
      "-jsonl",
    ]);

    return { target: host, subdomains, httpx, nuclei };
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}
