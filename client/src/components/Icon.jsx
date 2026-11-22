import ICONS from "../assets/icons.js";

/** Inline SVG icon (Lucide paths in assets/icons.js). Decorative: hidden from screen readers. */
export default function Icon({ name, className = "" }) {
  return (
    <svg
      className={"i " + className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || "" }}
    />
  );
}
