/** Small inline spinner for buttons and short waits. Decorative: pair it with text. */
export default function Spinner({ className = "" }) {
  return <span className={"spinner " + className} aria-hidden="true" />;
}
