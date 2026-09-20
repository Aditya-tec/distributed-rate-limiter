"use client";

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const routes = [
  { name: "Fixed window", path: "/demo/public", method: "GET", headers: {}, use: "simple public endpoints" },
  { name: "Sliding window", path: "/demo/authenticated", method: "GET", headers: { "x-api-key": "demo-visitor" }, use: "strict per-key limits" },
  { name: "Token bucket", path: "/demo/expensive", method: "POST", headers: { "x-api-key": "demo-visitor" }, use: "costly, bursty operations" },
];

const Arrow = () => <svg viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
function Brand() { return <Link href="/" className="brand"><span className="brand-mark"><i /><i /><i /></span><span>rate<span>flow</span></span></Link>; }

function RequestRow({ route, onDecision }) {
  const [remaining, setRemaining] = useState(5);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const send = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}${route.path}`, { method: route.method, headers: route.headers });
      const body = await response.json();
      const blocked = response.status === 429;
      const next = blocked ? 0 : body.rateLimit?.remaining ?? remaining;
      setRemaining(next);
      setResult({ blocked, code: response.status, reset: body.rateLimit?.reset || body.retryAfter });
      onDecision(blocked);
    } catch { setResult({ blocked: true, code: "ERR" }); }
    finally { setLoading(false); }
  };
  return <article className="request-row">
    <div className="route-name"><strong>{route.name}</strong><span>{route.use}</span></div>
    <code>{route.method} {route.path}</code>
    <div className="route-limit"><span>remaining</span><strong>{remaining}<small> / 5</small></strong></div>
    <div className="decision">{result ? <><b className={result.blocked ? "denied" : "allowed"}>{result.blocked ? "BLOCKED" : "ALLOWED"}</b><span>HTTP {result.code}{result.reset ? ` · reset ${result.reset}` : ""}</span></> : <span>awaiting request</span>}</div>
    <button onClick={send} disabled={loading}>{loading ? "Sending" : "Send"}<Arrow /></button>
  </article>;
}

export default function Landing() {
  const [decisions, setDecisions] = useState(0);
  const [denied, setDenied] = useState(false);
  const decision = blocked => { setDecisions(value => value + 1); setDenied(current => current || blocked); };
  return <div className="site-shell">
    <nav className="site-nav"><Brand /><div className="nav-links"><a href="https://github.com/Aditya-tec/distributed-rate-limiter" target="_blank" rel="noreferrer">Repository ↗</a><Link className="nav-cta" href="/dashboard">View live traffic <Arrow /></Link></div></nav>
    <main>
      <section className="hero product-hero">
        <p className="route-label">redis-backed rate limiting for express</p>
        <h1>Every request gets<br />one atomic answer.</h1>
        <p className="hero-copy">Identify the caller, evaluate its quota in Redis, and return a clear allow or block response. The same decision is safe across every application instance.</p>
        <div className="hero-actions"><a className="primary-cta" href="#request-lab">Send a test request <Arrow /></a><Link className="text-cta" href="/dashboard">Inspect the event stream <span>↗</span></Link></div>
        <div className="decision-strip"><span>request</span><i>→</i><span>caller key</span><i>→</i><strong>atomic Redis script</strong><i>→</i><span>headers + event</span></div>
      </section>

      <section id="request-lab" className="demo-section request-lab">
        <div className="section-heading"><div><p className="route-label">Live request lab</p><h2>Pick the rule that fits the route.</h2></div><p>Each button calls a protected endpoint. The row shows the real response status and remaining quota.</p></div>
        <div className="request-table">{routes.map(route => <RequestRow key={route.path} route={route} onDecision={decision} />)}</div>
        <div className="evidence-line"><span className={denied ? "block-indicator" : ""}>{denied ? "A request was rejected and sent to the event stream." : decisions ? `${decisions} live decision${decisions === 1 ? "" : "s"} recorded.` : "No fabricated traffic. Send a request to create real data."}</span><Link href="/dashboard">Open operations console <Arrow /></Link></div>
      </section>

      <section className="flow-section workflow"><div className="section-heading compact"><div><p className="route-label">Request lifecycle</p><h2>What the middleware actually does.</h2></div></div><div className="flow-grid"><article><span>01</span><h3>Find the caller</h3><p>Uses an API key when present, otherwise a forwarded or socket IP. Each identity maps to its own Redis key.</p></article><article><span>02</span><h3>Run one Redis operation</h3><p>A Lua script reads state, applies the chosen algorithm, and writes the result without a race window.</p></article><article><span>03</span><h3>Explain the decision</h3><p>Every response includes rate-limit headers. A 429 adds Retry-After; the dashboard receives the event.</p></article></div></section>

      <section className="code-section"><div className="code-copy"><p className="route-label">A concrete route</p><h2>Protect payment creation<br />without slowing it down.</h2><p>Token buckets permit small bursts, then throttle to the configured refill rate. Redis unavailability can fail closed for this route.</p></div><div className="code-window"><div className="code-top"><span>src/app.js</span><span>POST /api/payments</span></div><pre>{`app.post("/api/payments",
  createRateLimiter({
    algorithm: "token",
    capacity: 10,
    refillRate: 2,
    failOpen: false,
  }),
  paymentHandler
);`}</pre></div></section>
    </main>
    <footer><Brand /><p>Distributed rate limiting for Express and Redis.</p><a href="https://github.com/Aditya-tec/distributed-rate-limiter" target="_blank" rel="noreferrer">Read the source ↗</a></footer>
  </div>;
}
