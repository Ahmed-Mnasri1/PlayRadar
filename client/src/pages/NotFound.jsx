import { Link } from "react-router-dom";
export default function NotFound() {
  return <main id="main" className="wrap"><div className="empty" style={{ marginTop: 60 }}><h3>Page not found</h3><p><Link to="/" className="link-more">Back to home</Link></p></div></main>;
}
