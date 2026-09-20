import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";
import { resolveStoragePath } from "./config.js";

const sqlite = sqlite3.verbose();

export type EventPayload = Record<string, string | number | boolean | undefined | null>;

export class DatabaseService {
  private db: sqlite3.Database;

  constructor(storageRoot?: string) {
    const dbPath = path.join(resolveStoragePath(storageRoot), "egyxos.db");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new sqlite.Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    const schema = `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        objective TEXT,
        target TEXT,
        scope TEXT,
        status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        title TEXT NOT NULL,
        severity TEXT NOT NULL,
        confidence TEXT NOT NULL,
        target TEXT NOT NULL,
        endpoint TEXT,
        description TEXT,
        impact TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        finding_id TEXT,
        type TEXT NOT NULL,
        source TEXT,
        detail TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        tool TEXT NOT NULL,
        target TEXT NOT NULL,
        scope TEXT NOT NULL,
        reason TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_name TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `;

    this.db.exec(schema);
  }

  private sanitizePayload(payload: EventPayload): EventPayload {
    const redacted: EventPayload = {};

    for (const [key, value] of Object.entries(payload)) {
      const lower = key.toLowerCase();
      if (["password", "secret", "token", "api_key", "authorization", "cookie", "sessionid"].includes(lower)) {
        redacted[key] = "[redacted]";
        continue;
      }

      redacted[key] = value ?? "[empty]";
    }

    return redacted;
  }

  private run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(rows as T[]);
      });
    });
  }

  async createProject(name: string, pathName: string): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      "INSERT INTO projects (name, path, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [name, pathName, now, now],
    );
  }

  async listProjects(): Promise<Array<{ id: number; name: string; path: string }>> {
    return this.query<{ id: number; name: string; path: string }>(
      "SELECT id, name, path FROM projects ORDER BY created_at DESC",
    );
  }

  async saveSession(sessionId: string, projectName: string, objective: string, target: string, scope: string[], status: string): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      `INSERT INTO sessions (id, project_name, objective, target, scope, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET objective=excluded.objective, target=excluded.target, scope=excluded.scope, status=excluded.status, updated_at=excluded.updated_at`,
      [sessionId, projectName, objective, target, JSON.stringify(scope), status, now, now],
    );
  }

  async logEvent(eventName: string, payload: EventPayload = {}): Promise<void> {
    const safe = this.sanitizePayload(payload);
    const now = new Date().toISOString();
    await this.run(
      "INSERT INTO events (event_name, payload, created_at) VALUES (?, ?, ?)",
      [eventName, JSON.stringify(safe), now],
    );
  }

  async getEventLog(limit = 20): Promise<Array<{ id: number; event_name: string; payload: string; created_at: string }>> {
    return this.query(
      "SELECT id, event_name, payload, created_at FROM events ORDER BY created_at DESC LIMIT ?",
      [limit],
    );
  }

  async saveFinding(finding: { id: string; projectName: string; title: string; severity: string; confidence: string; target: string; endpoint: string; description: string; impact: string; status: string }): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      `INSERT INTO findings (id, project_name, title, severity, confidence, target, endpoint, description, impact, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finding.id,
        finding.projectName,
        finding.title,
        finding.severity,
        finding.confidence,
        finding.target,
        finding.endpoint,
        finding.description,
        finding.impact,
        finding.status,
        now,
      ],
    );
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
