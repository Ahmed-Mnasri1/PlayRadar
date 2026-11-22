// Small shared helpers: API client, formatters, local storage.
const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const usd = (v) => (v == null || Number.isNaN(v) ? "—" : usdFmt.format(v));
export const pct = (v) => "−" + v + "%";

export const fmtDate = (d, opts = { month: "short", day: "numeric", year: "numeric" }) => {
  if (typeof d === "string" && d.length === 4) return d;
  return new Date(typeof d === "string" ? d + "T00:00:00" : d).toLocaleDateString("en-US", opts);
};

export function timeAgo(t, now = Date.now()) {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return Math.round(s / 60) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + " h ago";
  return Math.round(s / 86400) + " d ago";
}

export const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const STORE_NAMES = {
  steam: "Steam",
  epic: "Epic Games Store",
  gog: "GOG",
  rockstar: "Rockstar Store",
  psn: "PlayStation Store",
  xbox: "Xbox Store",
  nintendo: "Nintendo eShop",
  ggretail: "Best retail store",
};
export const storeName = (id) => STORE_NAMES[id] || id;

export const storage = {
  get(k, d) {
    try {
      const v = localStorage.getItem("pr-" + k);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem("pr-" + k, JSON.stringify(v));
    } catch {
      /* private mode: state stays in memory */
    }
  },
};

/** Anonymous id of this browser: the server keys "My list" on it (no accounts). */
export const clientId = (() => {
  let id = storage.get("client", null);
  if (!id) {
    // randomUUID only exists in secure contexts (https / localhost), not on a LAN IP.
    id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
    storage.set("client", id);
  }
  return id;
})();

/** JSON fetch wrapper: throws an Error carrying `status` and the JSON `body` on failure. */
export async function api(path, { method = "GET", body } = {}) {
  const headers = { "X-Client-Id": clientId };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch("/api" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no JSON body */
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const DAY = 86400000;

/** Step history → time-weighted average price over the last `months`. */
export function averagePrice(steps, months, now = Date.now()) {
  if (!steps.length) return null;
  const t0 = Math.max(steps[0].t, now - months * 30.44 * DAY);
  let sum = 0;
  steps.forEach((p, i) => {
    const a = Math.max(p.t, t0);
    const b = i < steps.length - 1 ? steps[i + 1].t : now;
    if (b > a) sum += p.usd * (b - a);
  });
  return now > t0 ? sum / (now - t0) : steps[steps.length - 1].usd;
}
