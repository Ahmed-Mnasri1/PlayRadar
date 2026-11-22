import Icon from "../Icon.jsx";
import { useApp } from "../../hooks/useApp.js";

/** Notification bubble; screen readers hear it through the polite live region. */
export default function Toast() {
  const { toastState } = useApp();
  return (
    <div className={"toast" + (toastState ? " is-on" : "")} role="status" aria-live="polite">
      {toastState && (
        <>
          <Icon name={toastState.icon} />
          <span>{toastState.msg}</span>
        </>
      )}
    </div>
  );
}
