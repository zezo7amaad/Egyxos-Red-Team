import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AppConfig {
  project: string;
  storagePath: string;
  requireApproval: boolean;
  provider: string;
  model: string;
  tools: Record<string, boolean>;
}

export function resolveStoragePath(storageRoot?: string): string {
  if (storageRoot) {
    return storageRoot;
  }

  if (process.env.EGYXOS_STORAGE) {
    return process.env.EGYXOS_STORAGE;
  }

  return path.join(os.homedir(), ".egyxos-redteam");
}

export function assertSafeName(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(normalized) || normalized === "." || normalized === "..") {
    throw new Error(`${label} contains invalid path characters.`);
  }
  return normalized;
}

export function safeChildPath(parent: string, child: string, label: string): string {
  const safeChild = assertSafeName(child, label);
  const parentPath = path.resolve(parent);
  const childPath = path.resolve(parentPath, safeChild);
  if (!childPath.startsWith(`${parentPath}${path.sep}`)) {
    throw new Error(`${label} resolves outside the storage directory.`);
  }
  return childPath;
}

export function getConfigPath(storageRoot?: string): string {
  return path.join(resolveStoragePath(storageRoot), "config.json");
}

export function defaultConfig(storageRoot?: string): AppConfig {
  return {
    project: "default",
    storagePath: resolveStoragePath(storageRoot),
    requireApproval: true,
    provider: "gemini",
    model: "gemini-3.6-flash",
    tools: {
      httpx: true,
      katana: true,
      ffuf: true,
      sqlmap: false,
      nmap: true,
      nuclei: true,
      subfinder: true,
      curl: true,
      dig: true,
      whois: true,
    },
  };
}

export function loadConfig(storageRoot?: string): AppConfig {
  const root = resolveStoragePath(storageRoot);
  const configPath = getConfigPath(root);

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(root, { recursive: true });
    const cfg = defaultConfig(root);
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
    return cfg;
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<AppConfig>;
  const merged: AppConfig = {
    ...defaultConfig(root),
    ...parsed,
    model: parsed.model === "gemini-2.0-flash" ? defaultConfig(root).model : parsed.model ?? defaultConfig(root).model,
    tools: {
      ...defaultConfig(root).tools,
      ...(parsed.tools ?? {}),
    },
    storagePath: root,
  };

  if (parsed.model === "gemini-2.0-flash") {
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
  }

  return merged;
}

export function saveConfig(config: AppConfig, storageRoot?: string): AppConfig {
  const root = resolveStoragePath(storageRoot);
  const configPath = getConfigPath(root);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ ...config, storagePath: root }, null, 2));
  return { ...config, storagePath: root };
}

export function getProjectRoot(projectName?: string, storageRoot?: string): string {
  const root = resolveStoragePath(storageRoot);
  const name = projectName ?? loadConfig(root).project;
  return safeChildPath(path.join(root, "projects"), name, "Project name");
}
