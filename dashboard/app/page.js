"use client";
import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ALGORITHMS = [
  {
    id: "fixed",
    name: "Fixed Window",
    endpoint: "/demo/public",
    method: "GET",
    headers: {},
    description: "Divides time into fixed buckets. Fast and simple. Vulnerable to boundary burst attacks.",
    limit: 5,
    color: "#e8e8e8",
  },
  {
    id: "sliding",
    name: "Sliding Window",
    endpoint: "/demo/authenticated",
    method: "GET",
    headers: { "x-api-key": "demo-visitor" },
    description: "Always looks at the last N milliseconds using a Redis sorted set. Eliminates boundary edge cases.",
    limit: 5,
    color: "#a78bfa",
  },
  {
    id: "token",
    name: "Token Bucket",
    endpoint: "/demo/expensive",
    method: "POST",
    headers: { "x-api-key": "demo-visitor" },
    description: "Tokens refill over time. Allows bursting up to capacity then throttles to refill rate. Used by Stripe.",
    limit: 5,
    color: "#34d399",
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function AlgoCard({ algo, onFired }) {
  const [remaining, setRemaining] = useState(algo.limit);
  const [log, setLog] = useState([]);
  const [firing, setFiring] = useState(false);
  const [status, setStatus] = useState("idle");

  const addLog = (entry) => setLog((p) => [entry, ...p].slice(0, 6));

  const fire = async () => {
    if (firing) return;
    setFiring(true);
    try {
      const res = await fetch(`${API}${algo.endpoint}`, {
        method: algo.method,
        headers: algo.headers,
      });
      const data = await res.json();
      if (res.status === 429) {
        setStatus("blocked");
        setRemaining(0);
        addLog({ ok: false, code: 429, retry: data.retryAfter, ts: new Date().toLocaleTimeString() });
        setTimeout(() => setStatus("idle"), 800);
        onFired?.("blocked");
      } else {
        setStatus("allowed");
        setRemaining(data.rateLimit.remaining);
        addLog({ ok: true, remaining: data.rateLimit.remaining, ts: new Date().toLocaleTimeString() });
        setTimeout(() => setStatus("idle"), 400);
        onFired?.("allowed");
      }
    } catch {
      addLog({ ok: false, code: "ERR", ts: new Date().toLocaleTimeString() });
      setStatus("idle");
    }
    setFiring(false);
  };

  const blast = async () => {
    if (firing) return;
    for (let i = 0; i < 8; i++) { await fire(); await sleep(130); }
  };

  const pct = Math.max(0, (remaining / algo.limit) * 100);

  return (
    <div style={{
      borderTop: `2px solid ${algo.color}`,
      border: "1px solid #222",
      borderTopWidth: 2,
      borderTopColor: algo.color,
      background: "#0d0d0d",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "#666", letterSpacing: "0.1em", marginBottom: 5 }}>ALGORITHM</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: algo.color }}>{algo.name}</div>
        </div>
        <code style={{
          fontSize: 10, color: "#666",
          background: "#141414", border: "1px solid #222",
          padding: "3px 8px", whiteSpace: "nowrap",
        }}>
          {algo.method} {algo.endpoint}
        </code>
      </div>

      <p style={{ fontSize: 13, color: "#888", lineHeight: 1.65, margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {algo.description}
      </p>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "#666", letterSpacing: "0.08em" }}>REMAINING</span>
          <span style={{ fontSize: 10, color: remaining === 0 ? "#f87171" : algo.color, fontWeight: 700 }}>
            {remaining} / {algo.limit}
          </span>
        </div>
        <div style={{ height: 3, background: "#1a1a1a" }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: remaining === 0 ? "#f87171" : algo.color,
            transition: "width 0.25s ease, background 0.25s ease",
          }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={fire} disabled={firing} style={{
          flex: 1, padding: "11px 0",
          background: status === "blocked" ? "#1f0a0a" : status === "allowed" ? "#0a1f10" : "#141414",
          border: `1px solid ${status === "blocked" ? "#f87171" : status === "allowed" ? algo.color : "#2a2a2a"}`,
          color: status === "blocked" ? "#f87171" : algo.color,
          fontSize: 11, fontFamily: "inherit",
          letterSpacing: "0.1em", cursor: firing ? "not-allowed" : "pointer",
          transition: "all 0.15s", fontWeight: 600,
        }}>
          {status === "blocked" ? "429 BLOCKED" : firing ? "firing..." : "▶  FIRE REQUEST"}
        </button>
        <button onClick={blast} disabled={firing} style={{
          padding: "11px 16px",
          background: "#141414", border: "1px solid #2a2a2a",
          color: "#777", fontSize: 11, fontFamily: "inherit",
          letterSpacing: "0.08em", cursor: firing ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}>
          ×8
        </button>
      </div>

      <div style={{ minHeight: 80 }}>
        {log.length === 0
          ? <div style={{ fontSize: 11, color: "#333", paddingTop: 2, fontFamily: "system-ui, sans-serif" }}>
              — no requests yet —
            </div>
          : log.map((e, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, fontSize: 11,
              color: e.ok ? "#34d399" : "#f87171",
              opacity: 1 - i * 0.12, lineHeight: "22px",
            }}>
              <span style={{ color: "#444" }}>{e.ts}</span>
              <span>
                {e.ok
                  ? `HTTP 200  ·  ${e.remaining} remaining`
                  : `HTTP ${e.code}  ·  retry in ${e.retry ?? "?"}s`}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

const SNIPPET = `// protect any route in one line
app.use('/api', createRateLimiter({
  algorithm: 'sliding',
  limit: 100,
  windowMs: 60_000,
}));

// token bucket for burst-tolerant endpoints
app.post('/api/payment',
  createRateLimiter({
    algorithm: 'token',
    capacity: 10,
    refillRate: 2,
    failOpen: false,  // fail-closed on Redis outage
  }),
  paymentHandler
);`;

export default function Landing() {
  const [copied, setCopied] = useState(false);
  const [totalFired, setTotalFired] = useState(0);
  const [hasBlocked, setHasBlocked] = useState(false);

  const onFired = (result) => {
    setTotalFired((n) => n + 1);
    if (result === "blocked") setHasBlocked(true);
  };

  const copy = () => {
    navigator.clipboard.writeText(SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#d4d4d4",
      fontFamily: "'Courier New', monospace",
    }}>

      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid #1a1a1a",
        padding: "14px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
          <span style={{ fontSize: 12, letterSpacing: "0.1em", color: "#777" }}>RATE-LIMITER</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="https://github.com/Aditya-tec/distributed-rate-limiter"
            target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: "#666", textDecoration: "none", letterSpacing: "0.08em" }}>
            GITHUB ↗
          </a>
          <Link href="/dashboard" style={{
            fontSize: 11, color: "#e8e8e8", textDecoration: "none",
            letterSpacing: "0.08em", border: "1px solid #2a2a2a",
            padding: "6px 14px",
          }}>
            DASHBOARD →
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "0 40px 100px" }}>

        {/* Hero */}
        <div style={{ padding: "72px 0 56px", borderBottom: "1px solid #1a1a1a", marginBottom: 60 }}>
          <p style={{ fontSize: 11, color: "#34d399", letterSpacing: "0.14em", margin: "0 0 20px" }}>
            PRODUCTION READY · 3 ALGORITHMS · ATOMIC LUA SCRIPTS · REAL-TIME DASHBOARD
          </p>
          <h1 style={{
            fontSize: "clamp(38px, 6vw, 68px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            margin: "0 0 22px",
            color: "#f0f0f0",
          }}>
            Distributed rate limiting<br />
            <span style={{ color: "#2e2e2e" }}>done right.</span>
          </h1>
          <p style={{
            fontSize: 15, color: "#888", lineHeight: 1.75,
            maxWidth: 500, margin: "0 0 32px",
            fontFamily: "system-ui, sans-serif",
          }}>
            Express middleware that identifies callers by API key or IP,
            runs an atomic Lua script in Redis, and allows or blocks —
            with zero race conditions across any number of instances.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              ["No race conditions", "Lua atomic ops"],
              ["3 algorithms", "fixed · sliding · token"],
              ["Fail-safe", "open or closed per route"],
              ["24 tests", "real Redis in CI"],
            ].map(([label, sub]) => (
              <div key={label} style={{
                border: "1px solid #222", padding: "8px 14px", fontSize: 11,
              }}>
                <span style={{ color: "#ccc" }}>{label}</span>
                <span style={{ color: "#3a3a3a", marginLeft: 8 }}>// {sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live demo */}
        <div style={{ marginBottom: 0 }}>
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 10, color: "#666", letterSpacing: "0.12em", margin: "0 0 6px" }}>
              INTERACTIVE DEMO
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#f0f0f0" }}>
              Fire real requests. Watch it block.
            </h2>
            <p style={{ fontSize: 13, color: "#777", margin: 0, fontFamily: "system-ui, sans-serif" }}>
              Hits the live production API on Render + Upstash Redis.
              Press <strong style={{ color: "#bbb" }}>×8</strong> to drain the limit and trigger a 429.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginBottom: 16 }}>
            {ALGORITHMS.map((a) => <AlgoCard key={a.id} algo={a} onFired={onFired} />)}
          </div>

          {/* Dashboard callout — always visible, changes based on state */}
          <div style={{
            border: `1px solid ${hasBlocked ? "#f8717144" : "#34d39933"}`,
            borderLeft: `3px solid ${hasBlocked ? "#f87171" : "#34d399"}`,
            background: hasBlocked ? "#120808" : "#080f0c",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0", margin: "0 0 3px" }}>
                {hasBlocked
                  ? `You triggered a 429 — it's recorded live on the dashboard`
                  : totalFired > 0
                    ? `${totalFired} request${totalFired > 1 ? "s" : ""} fired — see them tracked in real time`
                    : "Every request above is tracked live on the dashboard"}
              </p>
              <p style={{ fontSize: 11, color: "#666", margin: 0, fontFamily: "system-ui, sans-serif" }}>
                Real-time chart · allowed vs blocked · top blocked identifiers · SSE live feed
              </p>
            </div>
            <Link href="/dashboard" style={{
              padding: "10px 20px",
              background: "#f0f0f0",
              color: "#080808",
              textDecoration: "none",
              fontSize: 11,
              fontFamily: "inherit",
              letterSpacing: "0.08em",
              fontWeight: 700,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              OPEN DASHBOARD →
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 64, marginTop: 64, marginBottom: 64 }}>
          <p style={{ fontSize: 10, color: "#666", letterSpacing: "0.12em", margin: "0 0 32px" }}>HOW IT WORKS</p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 1,
            background: "#1a1a1a",
          }}>
            {[
              ["01", "Identify caller", "x-api-key header takes priority. Falls back to x-forwarded-for then socket IP. Every caller gets an isolated Redis key."],
              ["02", "Atomic Lua script", "One script runs inside Redis. Read, decide, write — one indivisible operation. No race condition possible at any scale."],
              ["03", "Headers always", "X-RateLimit-Limit, Remaining, Reset on every response. Retry-After on every 429. Clients always know their state."],
              ["04", "Fail safely", "Redis down? Each route is configured fail-open or fail-closed independently. No silent failures, no surprise outages."],
            ].map(([n, title, body]) => (
              <div key={n} style={{ background: "#0d0d0d", padding: 28 }}>
                <div style={{ fontSize: 11, color: "#2e2e2e", marginBottom: 14, letterSpacing: "0.08em" }}>{n}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8e8", marginBottom: 10 }}>{title}</div>
                <p style={{ fontSize: 12, color: "#777", lineHeight: 1.7, margin: 0, fontFamily: "system-ui, sans-serif" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Code */}
        <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 64, marginBottom: 64 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 10, color: "#666", letterSpacing: "0.12em", margin: "0 0 6px" }}>USAGE</p>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: "#f0f0f0" }}>
                One line to protect any route.
              </h2>
            </div>
            <button onClick={copy} style={{
              background: "transparent", border: "1px solid #222",
              color: copied ? "#34d399" : "#666",
              padding: "7px 14px", fontSize: 10, fontFamily: "inherit",
              letterSpacing: "0.1em", cursor: "pointer", transition: "color 0.2s",
            }}>
              {copied ? "COPIED ✓" : "COPY"}
            </button>
          </div>
          <pre style={{
            background: "#0d0d0d", border: "1px solid #1a1a1a",
            padding: "24px 28px", fontSize: 12, lineHeight: 1.85,
            color: "#777", overflowX: "auto", margin: 0,
          }}>
            {SNIPPET.split("\n").map((line, i) => {
              const colored = line
                .replace(/(\/\/.*)/g, '<span style="color:#2e2e2e">$1</span>')
                .replace(/('.*?')/g, '<span style="color:#34d399">$1</span>')
                .replace(/\b(import|from|app|const)\b/g, '<span style="color:#a78bfa">$1</span>');
              return <span key={i} dangerouslySetInnerHTML={{ __html: colored + "\n" }} />;
            })}
          </pre>
        </div>

        {/* Footer CTA */}
        <div style={{
          borderTop: "1px solid #1a1a1a", paddingTop: 48,
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 20,
        }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px", color: "#f0f0f0" }}>
              See it live.
            </h3>
            <p style={{ fontSize: 12, color: "#777", margin: 0, fontFamily: "system-ui, sans-serif" }}>
              Real-time charts, SSE event feed, top blocked identifiers.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="https://github.com/Aditya-tec/distributed-rate-limiter"
              target="_blank" rel="noreferrer"
              style={{
                padding: "10px 18px", border: "1px solid #1e1e1e",
                color: "#777", textDecoration: "none", fontSize: 11,
                fontFamily: "inherit", letterSpacing: "0.08em",
              }}>
              VIEW SOURCE ↗
            </a>
            <Link href="/dashboard" style={{
              padding: "10px 18px",
              background: "#f0f0f0", color: "#080808",
              textDecoration: "none", fontSize: 11,
              fontFamily: "inherit", letterSpacing: "0.08em", fontWeight: 700,
            }}>
              OPEN DASHBOARD →
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}