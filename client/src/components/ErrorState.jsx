import Icon from "./Icon.jsx";

/** Error message with an optional "Try again" button. */
export default function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="empty error-state" role="alert">
      <Icon name="info" />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
