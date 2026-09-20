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

export function getConfigPath(storageRoot?: string): string {
  return path.join(resolveStoragePath(storageRoot), "config.json");
}

export function defaultConfig(storageRoot?: string): AppConfig {
  return {
    project: "default",
    storagePath: resolveStoragePath(storageRoot),
    requireApproval: true,
    provider: "gemini",
    model: "gemini-2.0-flash",
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
  return {
    ...defaultConfig(root),
    ...parsed,
    model: parsed.model ?? defaultConfig(root).model,
    tools: {
      ...defaultConfig(root).tools,
      ...(parsed.tools ?? {}),
    },
    storagePath: root,
  };
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
  return path.join(root, "projects", name);
}
