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

const MAX_CAPTURE_BYTES = 8 * 1024 * 1024;

function readCapturedOutput(file: string): string {
  const content = fs.readFileSync(file, "utf8");
  return content.length > MAX_CAPTURE_BYTES
    ? `${content.slice(0, MAX_CAPTURE_BYTES)}\n[output truncated]`
    : content;
}

function runBinary(binary: string, args: string[], timeoutMs: number, label = binary): string {
  return runCapturedBinary(binary, args, timeoutMs, label);
}

function runCapturedBinary(binary: string, args: string[], timeoutMs: number, label: string): string {
  const outputBase = path.join(os.tmpdir(), `egyxos-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const stdoutFile = `${outputBase}.out`;
  const stderrFile = `${outputBase}.err`;
  const stdoutFd = fs.openSync(stdoutFile, "w");
  const stderrFd = fs.openSync(stderrFile, "w");

  try {
    const result = spawnSync(binary, args, {
      stdio: ["ignore", stdoutFd, stderrFd],
      timeout: timeoutMs,
      windowsHide: true,
    });

    fs.closeSync(stdoutFd);
    fs.closeSync(stderrFd);

    const stdout = readCapturedOutput(stdoutFile);
    const stderr = readCapturedOutput(stderrFile);

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
      const detail = (stderr || stdout).trim().slice(0, 1_000);
      throw new Error(`${binary} exited with status ${result.status}${detail ? `: ${detail}` : "."}`);
    }

    return stdout.trim();
  } finally {
    try {
      fs.closeSync(stdoutFd);
    } catch {
      // The descriptor was already closed after the process exited.
    }
    try {
      fs.closeSync(stderrFd);
    } catch {
      // The descriptor was already closed after the process exited.
    }
    fs.rmSync(stdoutFile, { force: true });
    fs.rmSync(stderrFile, { force: true });
  }
}

function runHttpx(targetFile: string): string {
  const timeoutMs = readTimeout("EGYXOS_TOOL_TIMEOUT_MS", 120_000);
  try {
    return runCapturedBinary("httpx", ["-l", targetFile, "-silent", "-title"], timeoutMs, "ProjectDiscovery httpx");
  } catch (error) {
    if (error instanceof Error && /exited with status/.test(error.message)) {
      const detail = error.message;
      if (detail.includes("No such option: -l") || detail.includes("Usage: httpx [OPTIONS] URL")) {
        throw new Error(
          "The installed 'httpx' is the Python HTTP client CLI, not ProjectDiscovery httpx. "
          + "Install ProjectDiscovery httpx and ensure its binary appears first on PATH.",
        );
      }
    }
    throw error;
  }
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
