import fs from "node:fs";
import path from "node:path";
import { ensureProject, listProjects } from "./project.js";
import { assertSafeName, resolveStoragePath, safeChildPath } from "./config.js";
import type { SessionRecord } from "./types.js";

export function startSession(projectName?: string, objective = "Assessment", target = "https://example.com", storageRoot?: string): SessionRecord {
  const project = ensureProject(projectName, storageRoot);
  const projectsRoot = path.resolve(resolveStoragePath(storageRoot), "projects");
  const resolvedProjectPath = path.resolve(project.path);
  const relProjectPath = path.relative(projectsRoot, resolvedProjectPath);
  if (relProjectPath.startsWith("..") || path.isAbsolute(relProjectPath)) {
    throw new Error("Invalid file path");
  }
  const sessionDir = path.join(resolvedProjectPath, "sessions");
  const id = `session-${Date.now().toString(36)}`;
  const record: SessionRecord = {
    id,
    objective,
    target,
    scope: project.scope,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [`Started objective: ${objective}`],
    approvals: [],
  };

  fs.writeFileSync(path.join(sessionDir, `${id}.json`), JSON.stringify(record, null, 2));
  return record;
}

export function listSessions(projectName?: string, storageRoot?: string): SessionRecord[] {
  const project = ensureProject(projectName, storageRoot);
  const projectsRoot = path.resolve(resolveStoragePath(storageRoot), "projects");
  const resolvedProjectPath = path.resolve(project.path);
  const relProjectPath = path.relative(projectsRoot, resolvedProjectPath);
  if (relProjectPath.startsWith("..") || path.isAbsolute(relProjectPath)) {
    throw new Error("Invalid file path");
  }
  const sessionDir = path.join(resolvedProjectPath, "sessions");
  if (!fs.existsSync(sessionDir)) {
    return [];
  }

  return fs
    .readdirSync(sessionDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(sessionDir, file), "utf8")) as SessionRecord)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function resumeSession(sessionId: string, projectName?: string, storageRoot?: string): SessionRecord {
  const project = ensureProject(projectName, storageRoot);
  const sessionFile = safeChildPath(path.join(project.path, "sessions"), `${assertSafeName(sessionId, "Session ID")}.json`, "Session ID");
  if (!fs.existsSync(sessionFile)) {
    throw new Error(`Session '${sessionId}' not found.`);
  }

  const record = JSON.parse(fs.readFileSync(sessionFile, "utf8")) as SessionRecord;
  record.status = "active";
  record.updatedAt = new Date().toISOString();
  fs.writeFileSync(sessionFile, JSON.stringify(record, null, 2));
  return record;
}

export function getDefaultProjectName(storageRoot?: string): string {
  const config = JSON.parse(
    fs.readFileSync(path.join(resolveStoragePath(storageRoot), "config.json"), "utf8"),
  );
  return config.project ?? "default";
}

export function getSessionCount(storageRoot?: string): number {
  const projects = listProjects(storageRoot);
  const projectsRoot = path.resolve(resolveStoragePath(storageRoot), "projects");
  return projects.reduce((count, project) => {
    const resolvedProjectPath = path.resolve(project.path);
    const relProjectPath = path.relative(projectsRoot, resolvedProjectPath);
    if (relProjectPath.startsWith("..") || path.isAbsolute(relProjectPath)) {
      throw new Error("Invalid file path");
    }
    const dir = path.join(resolvedProjectPath, "sessions");
    return count + (fs.existsSync(dir) ? fs.readdirSync(dir).length : 0);
  }, 0);
}
