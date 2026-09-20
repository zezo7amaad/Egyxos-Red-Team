import fs from "node:fs";
import path from "node:path";
import { getProjectRoot, loadConfig, resolveStoragePath, saveConfig } from "./config.js";
import type { ProjectRecord } from "./types.js";

export function createProject(name: string, storageRoot?: string): ProjectRecord {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error("Project name is required.");
  }

  const root = resolveStoragePath(storageRoot);
  const projectDir = path.join(root, "projects", normalized);
  if (fs.existsSync(projectDir)) {
    throw new Error(`Project '${normalized}' already exists.`);
  }

  fs.mkdirSync(path.join(projectDir, "sessions"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "evidence"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "findings"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "notes"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "reports"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "intelligence"), { recursive: true });

  const record: ProjectRecord = {
    name: normalized,
    path: projectDir,
    createdAt: new Date().toISOString(),
    lastOpenAt: new Date().toISOString(),
    scope: [],
  };

  fs.writeFileSync(path.join(projectDir, "project.json"), JSON.stringify(record, null, 2));
  fs.writeFileSync(path.join(projectDir, "project.yaml"), `name: ${record.name}\npath: ${record.path}\ncreatedAt: ${record.createdAt}\nlastOpenAt: ${record.lastOpenAt}\nscope: []\n`);
  fs.writeFileSync(path.join(projectDir, "scope.json"), JSON.stringify({ allowed: [] }, null, 2));
  fs.writeFileSync(path.join(projectDir, "scope.yaml"), "allowed: []\n");

  const config = loadConfig(root);
  config.project = normalized;
  saveConfig(config, root);
  return record;
}

export function openProject(name: string, storageRoot?: string): ProjectRecord {
  const root = resolveStoragePath(storageRoot);
  const projectDir = path.join(root, "projects", name);
  if (!fs.existsSync(projectDir)) {
    throw new Error(`Project '${name}' does not exist.`);
  }

  const projectFile = path.join(projectDir, "project.json");
  const record = JSON.parse(fs.readFileSync(projectFile, "utf8")) as ProjectRecord;
  record.lastOpenAt = new Date().toISOString();
  fs.writeFileSync(projectFile, JSON.stringify(record, null, 2));
  fs.writeFileSync(path.join(projectDir, "project.yaml"), `name: ${record.name}\npath: ${record.path}\ncreatedAt: ${record.createdAt}\nlastOpenAt: ${record.lastOpenAt}\nscope:\n  - ${record.scope.join("\n  - ") || ""}\n`);

  const config = loadConfig(root);
  config.project = name;
  saveConfig(config, root);
  return record;
}

export function listProjects(storageRoot?: string): ProjectRecord[] {
  const root = resolveStoragePath(storageRoot);
  const projectsDir = path.join(root, "projects");
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const entries = fs.readdirSync(projectsDir, { withFileTypes: true }) as fs.Dirent[];

  return entries
    .filter((entry: fs.Dirent) => entry.isDirectory())
    .map((entry: fs.Dirent) => {
      const projectFile = path.join(projectsDir, entry.name, "project.json");
      if (!fs.existsSync(projectFile)) {
        return null;
      }

      return JSON.parse(fs.readFileSync(projectFile, "utf8")) as ProjectRecord;
    })
    .filter((entry): entry is ProjectRecord => Boolean(entry));
}

export function ensureProject(projectName?: string, storageRoot?: string): ProjectRecord {
  const config = loadConfig(storageRoot);
  const current = projectName ?? config.project;
  const projectRoot = getProjectRoot(current, storageRoot);

  if (!fs.existsSync(projectRoot)) {
    return createProject(current, storageRoot);
  }

  const projectFile = path.join(projectRoot, "project.json");
  return JSON.parse(fs.readFileSync(projectFile, "utf8")) as ProjectRecord;
}

export function addScope(domain: string, projectName?: string, storageRoot?: string): string[] {
  const project = ensureProject(projectName, storageRoot);
  const scopeFile = path.join(project.path, "scope.json");
  const scopeDoc: { allowed?: string[] } = fs.existsSync(scopeFile)
    ? JSON.parse(fs.readFileSync(scopeFile, "utf8"))
    : { allowed: [] };

  const value = domain.trim().toLowerCase();
  if (!value) {
    throw new Error("Scope domain cannot be empty.");
  }

  const allowed: string[] = Array.isArray(scopeDoc.allowed) ? scopeDoc.allowed : [];
  if (!allowed.includes(value)) {
    allowed.push(value);
  }

  scopeDoc.allowed = allowed;
  fs.writeFileSync(scopeFile, JSON.stringify(scopeDoc, null, 2));
  fs.writeFileSync(path.join(project.path, "scope.yaml"), `allowed:\n${allowed.map((entry) => `  - ${entry}`).join("\n")}\n`);

  project.scope = allowed;
  fs.writeFileSync(path.join(project.path, "project.json"), JSON.stringify(project, null, 2));
  fs.writeFileSync(path.join(project.path, "project.yaml"), `name: ${project.name}\npath: ${project.path}\ncreatedAt: ${project.createdAt}\nlastOpenAt: ${project.lastOpenAt}\nscope:\n${allowed.map((entry) => `  - ${entry}`).join("\n")}\n`);
  return allowed;
}

export function showScope(projectName?: string, storageRoot?: string): string[] {
  const project = ensureProject(projectName, storageRoot);
  const scopeFile = path.join(project.path, "scope.json");
  if (!fs.existsSync(scopeFile)) {
    return [];
  }

  const scopeDoc = JSON.parse(fs.readFileSync(scopeFile, "utf8"));
  return Array.isArray(scopeDoc.allowed) ? scopeDoc.allowed : [];
}
