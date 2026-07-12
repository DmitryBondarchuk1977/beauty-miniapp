/**
 * Простой кэш для Mini App.
 *  • memory — мгновенный доступ в рамках сессии
 *  • sessionStorage — переживает переходы между экранами
 *  • localStorage — для долгоживущих вещей (кто я)
 *
 * Стратегия: stale-while-revalidate — сразу отдаём старое,
 * параллельно обновляем в фоне.
 */

type Entry<T> = { v: T; t: number };

const mem = new Map<string, Entry<unknown>>();

function store(persist: "session" | "local" | "none") {
  if (persist === "session") return window.sessionStorage;
  if (persist === "local") return window.localStorage;
  return null;
}

export function cacheGet<T>(
  key: string,
  ttlMs: number,
  persist: "session" | "local" | "none" = "session",
): { value: T; fresh: boolean } | null {
  let e = mem.get(key) as Entry<T> | undefined;

  if (!e) {
    const s = store(persist);
    if (s) {
      try {
        const raw = s.getItem(`c:${key}`);
        if (raw) {
          e = JSON.parse(raw) as Entry<T>;
          mem.set(key, e);
        }
      } catch {
        /* noop */
      }
    }
  }

  if (!e) return null;
  return { value: e.v, fresh: Date.now() - e.t < ttlMs };
}

export function cacheSet<T>(
  key: string,
  value: T,
  persist: "session" | "local" | "none" = "session",
) {
  const e: Entry<T> = { v: value, t: Date.now() };
  mem.set(key, e);
  const s = store(persist);
  if (s) {
    try {
      s.setItem(`c:${key}`, JSON.stringify(e));
    } catch {
      /* noop */
    }
  }
}

export function cacheDrop(key: string, persist: "session" | "local" | "none" = "session") {
  mem.delete(key);
  const s = store(persist);
  if (s) {
    try {
      s.removeItem(`c:${key}`);
    } catch {
      /* noop */
    }
  }
}

/** Сбросить все кэши мастера (после отметки записи и т.п.) */
export function cacheDropPrefix(prefix: string, persist: "session" | "local" | "none" = "session") {
  for (const k of [...mem.keys()]) {
    if (k.startsWith(prefix)) mem.delete(k);
  }
  const s = store(persist);
  if (s) {
    try {
      const kill: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(`c:${prefix}`)) kill.push(k);
      }
      kill.forEach((k) => s.removeItem(k));
    } catch {
      /* noop */
    }
  }
}
