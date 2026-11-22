import { useApp } from "../hooks/useApp.js";

/** Store name with its two-letter monogram, tinted with the store colour. */
export function StoreChip({ id }) {
  const { meta } = useApp();
  const s = meta && meta.stores[id];
  if (!s) return <span className="store">{id}</span>;
  return (
    <span className="store">
      <span className="store__mono" style={{ "--tint": s.tint }} aria-hidden="true">
        {s.short}
      </span>
      {s.name}
    </span>
  );
}

/** Filled dot = live price from a public API; hollow dot = sample price. */
export const SourceDot = ({ src }) =>
  src === "live" ? (
    <i className="real-dot" title="Live price, fetched from the store's public API" />
  ) : (
    <i className="sample-dot" title="Sample price (no public API connected for this store)" />
  );
