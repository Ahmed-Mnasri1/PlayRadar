import { Component } from "react";
import ErrorState from "./ErrorState.jsx";

/**
 * Catches render errors and failed lazy-page downloads (e.g. a new version was
 * deployed and the old chunk is gone) so one broken page does not blank the site.
 * App.jsx keys it by route, so navigating elsewhere clears the error.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[PlayRadar] page crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main id="main" className="wrap">
        <ErrorState
          title="This page could not be displayed"
          message="Check your connection, then reload the page."
          onRetry={() => window.location.reload()}
        />
      </main>
    );
  }
}
