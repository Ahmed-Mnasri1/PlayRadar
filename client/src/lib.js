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

export async function api(path, opts) {
  const res = await fetch("/api" + path, opts);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* no JSON body */
  }
  if (!res.ok) {
    const err = new Error((body && body.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

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
