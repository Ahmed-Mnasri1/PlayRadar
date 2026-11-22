import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../hooks/useApp.js";
import { useApi } from "../hooks/useApi.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import Icon from "../components/Icon.jsx";
import ChangeList from "../components/ChangeList.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { Loading, RowsSkeleton } from "../components/Skeleton.jsx";

export default function Changes() {
  const { version, region, meta, live } = useApp();
  const [kind, setKind] = useState("all");
  const [mine, setMine] = useState(false);
  useDocumentTitle("Price changes — PlayRadar");

  const q = new URLSearchParams({ limit: "80" });
  if (kind !== "all") q.set("kind", kind);
  if (mine) q.set("region", region);
  const { data, error, reload } = useApi("/changes?" + q, version);

  const regionName = meta?.regions.find((r) => r.code === region)?.name;
  const steam = live.status?.sources.steam;

  return (
    <main id="main" className="wrap">
      <div className="page-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <Icon name="chevron-right" />
          <span>Price changes</span>
        </nav>
        <h1>Price changes</h1>
        <p>Every price movement detected by the watcher, newest first. This page updates by itself — no need to reload.</p>
      </div>
      <div className="source-box">
        <span className={"livepill " + (live.connected ? "is-live" : "is-off")}>
          <i />
          {live.connected ? "Connected" : "Reconnecting…"}
        </span>
        <p>
          <i className="real-dot" /> <b>Live</b>: Steam prices fetched from the public store API
          {steam ? (steam.ok ? " (working)" : ` — currently unreachable: ${steam.error || "no answer yet"}`) : ""}.{" "}
          <i className="sample-dot" /> <b>Sample</b>: stores without a public API are simulated
          {live.status?.demo ? " and drift on purpose in demo mode" : ""}.
        </p>
      </div>
      <div className="list-bar">
        <div className="seg" role="group" aria-label="Type of price">
          {[
            ["all", "All"],
            ["official", "Official stores"],
            ["key", "Key shops"],
          ].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={kind === v} onClick={() => setKind(v)}>
              {l}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only {regionName || "my region"} (+ keys)
        </label>
      </div>
      <h2 className="sr-only">Latest changes</h2>
      {data ? (
        <ChangeList changes={data.changes} />
      ) : error ? (
        <ErrorState title="Could not load the price changes" message={error.message} onRetry={reload} />
      ) : (
        <Loading label="Loading price changes…">
          <RowsSkeleton count={8} />
        </Loading>
      )}
    </main>
  );
}
