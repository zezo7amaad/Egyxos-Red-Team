export interface ScopeValidationResult {
  ok: boolean;
  reason?: string;
  host?: string;
}

export function normalizeHost(target: string): string {
  const value = target.trim();
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function validateTarget(target: string, allowed: string[]): ScopeValidationResult {
  const host = normalizeHost(target);
  if (!host) {
    return { ok: false, reason: "Target is missing or invalid." };
  }

  if (!allowed.length) {
    return { ok: false, reason: `Target '${host}' is outside the active scope. Add a scope entry first.` };
  }

  const normalizedAllowed = allowed.map((entry) => normalizeHost(entry));

  const matches = normalizedAllowed.some((entry) => {
    if (!entry) {
      return false;
    }

    return host === entry || host.endsWith(`.${entry}`);
  });

  if (!matches) {
    return {
      ok: false,
      reason: `Target '${host}' is not in scope. Allowed: ${normalizedAllowed.join(", ")}`,
      host,
    };
  }

  return { ok: true, host };
}
