import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib.js";
import { Icon } from "../components/ui.jsx";
import { useApp } from "../context.jsx";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Contact() {
  const { toast } = useApp();
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { document.title = "Contact — PlayRadar"; }, []);
  const set = (k) => (e) => (setF({ ...f, [k]: e.target.value }), setErrors({ ...errors, [k]: undefined }));

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = "Please enter your name.";
    if (!EMAIL.test(f.email.trim())) er.email = "Please enter a valid email address.";
    if (f.message.trim().length < 10) er.message = "Your message should be at least 10 characters.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api("/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      setDone(true);
      toast("Message sent — thank you!", "mail");
    } catch (err) {
      setErrors(err.body?.errors || { form: err.message });
    }
    setBusy(false);
  }

  return (
    <main id="main" className="wrap">
      <div className="page-head">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><Icon name="chevron-right" /><span>Contact</span></nav>
        <h1>Contact us</h1>
        <p>A bug, a missing game, a store to add? Tell us.</p>
      </div>
      {done ? (
        <div className="empty"><h3>Message sent</h3><p>Thanks {f.name.split(" ")[0]}, we'll get back to you at {f.email}.</p><Link className="btn btn--ghost btn--sm" to="/" style={{ marginTop: 16 }}>Back to home</Link></div>
      ) : (
        <form className="contact" onSubmit={submit} noValidate>
          {[["name", "Your name", "text"], ["email", "Email address", "email"], ["subject", "Subject (optional)", "text"]].map(([k, l, t]) => (
            <label className="field" key={k}>
              <span className="field__label">{l}</span>
              <span className="field__box"><input className="field__input" type={t} value={f[k]} onChange={set(k)} aria-invalid={!!errors[k]} /></span>
              {errors[k] && <span className="field__hint field__hint--err">{errors[k]}</span>}
            </label>
          ))}
          <label className="field">
            <span className="field__label">Message</span>
            <span className="field__box"><textarea className="field__input" rows="6" value={f.message} onChange={set("message")} aria-invalid={!!errors.message} /></span>
            {errors.message && <span className="field__hint field__hint--err">{errors.message}</span>}
          </label>
          {errors.form && <p className="field__hint field__hint--err">{errors.form}</p>}
          <button className="btn btn--primary" type="submit" disabled={busy}><Icon name="mail" />{busy ? "Sending…" : "Send message"}</button>
        </form>
      )}
    </main>
  );
}
