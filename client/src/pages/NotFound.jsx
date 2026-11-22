import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

export default function NotFound() {
  useDocumentTitle("Page not found — PlayRadar");
  return (
    <main id="main" className="wrap">
      <div className="empty" style={{ marginTop: 60 }}>
        <h1 className="h3">Page not found</h1>
        <p>
          <Link to="/" className="link-more">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
