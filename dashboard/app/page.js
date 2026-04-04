"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ALGORITHMS = [
  {
    id: "fixed",
    name: "Fixed Window",
    endpoint: "/demo/public",
    method: "GET",
    description: "Divides time into fixed buckets. Fast and simple. Has a boundary edge case at window edges.",
    weakness: "Boundary burst attack possible",
    limit: 5,
    color: "#e8e8e8",
    accent: "#3a3a3a",
  },
  {
    id: "sliding",
    name: "Sliding Window",
    endpoint: "/demo/authenticated",
    method: "GET",
    headers: { "x-api-key": "demo-visitor" },
    description: "Always looks at the last N milliseconds. Eliminates the boundary edge case using a Redis sorted set.",
    weakness: "Higher memory per user",
    limit: 5,
    color: "#a78bfa",
    accent: "#2d2040",
  },
  {
    id: "token",
    name: "Token Bucket",
    endpoint: "/demo/expensive",
    method: "POST",
    headers: { "x-api-key": "demo-visitor" },
    description: "Tokens refill over time. Allows bursting up to capacity, then throttles to refill rate. Used by Stripe.",
    weakness: "More complex state management",
    limit: 5,
    color: "#34d399",
    accent: "#0a2018",
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const AlgoCard = ({ algo }) => {
  const [remaining, setRemaining] = useState(algo.limit);
  const [log, setLog] = useState([]);
  const [firing, setFiring] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const logRef = useRef(null);

  const addLog = (entry) => {
    setLog((prev) => [entry, ...prev].slice(0, 8));
  };

  const fire = async () => {
    if (firing) return;
    setFiring(true);

    try {
      const res = await fetch(`${API}${algo.endpoint}`, {
        method: algo.method,
        headers: algo.headers || {},
      });

      const data = await res.json();

      if (res.status === 429) {
        setBlocked(true);
        setRemaining(0);
        addLog({
          status: 429,
          allowed: false,
          retryAfter: data.retryAfter,
          ts: new Date().toLocaleTimeString(),
        });
        setTimeout(() => setBlocked(false), 1000);
      } else {
        const rl = data.rateLimit;
        setRemaining(rl.remaining);
        setBlocked(false);
        addLog({
          status: 200,
          allowed: true,
          remaining: rl.remaining,
          algorithm: rl.algorithm,
          ts: new Date().toLocaleTimeString(),
        });
      }
    } catch {
      addLog({ status: "ERR", allowed: false, ts: new Date().toLocaleTimeString() });
    }

    setFiring(false);
  };

  const blast = async () => {
    if (firing) return;
    for (let i = 0; i < 8; i++) {
      await fire();
      await sleep(120);
    }
  };

  const pct = (remaining / algo.limit) * 100;

  return (
    <div style={{
      border: `1px solid ${algo.color}22`,
      borderTop: `3px solid ${algo.color}`,
      borderRadius: 6,
      background: `linear-gradient(135deg, ${algo.color}06, ${algo.color}03)`,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      fontFamily: "'Courier New', monospace",
      boxShadow: `0 8px 24px ${algo.color}11, inset 0 1px 0 ${algo.color}22`,
      transition: "all 0.3s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = `0 12px 32px ${algo.color}22, inset 0 1px 0 ${algo.color}33`;
      e.currentTarget.style.borderColor = `${algo.color}44`;
      e.currentTarget.style.transform = "translateY(-2px)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = `0 8px 24px ${algo.color}11, inset 0 1px 0 ${algo.color}22`;
      e.currentTarget.style.borderColor = `${algo.color}22`;
      e.currentTarget.style.transform = "translateY(0)";
    }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", marginBottom: 4 }}>
            ALGORITHM
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: algo.color, letterSpacing: "-0.01em" }}>
            {algo.name}
          </div>
        </div>
        <div style={{
          fontSize: 11,
          color: algo.color,
          background: algo.accent,
          border: `1px solid ${algo.color}22`,
          padding: "4px 10px",
          borderRadius: 3,
          boxShadow: `0 0 8px ${algo.color}22`,
        }}>
          {algo.method} {algo.endpoint}
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: "#777", lineHeight: 1.6, margin: 0 }}>
        {algo.description}
      </p>

      {/* Token meter */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "#666" }}>REMAINING REQUESTS</span>
          <span style={{ fontSize: 11, color: remaining === 0 ? "#f87171" : algo.color, fontWeight: 600 }}>
            {remaining} / {algo.limit}
          </span>
        </div>
        <div style={{ height: 5, background: "#111", borderRadius: 3, overflow: "hidden", boxShadow: "inset 0 1px 3px #00000088" }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: remaining === 0 ? "#f87171" : `linear-gradient(90deg, ${algo.color}, ${algo.color}dd)`,
            borderRadius: 3,
            transition: "width 0.3s ease, background 0.3s ease",
            boxShadow: remaining === 0 ? `0 0 12px #f8717166` : `0 0 12px ${algo.color}66`,
          }} />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={fire} disabled={firing} style={{
          flex: 1,
          padding: "11px 0",
          background: blocked ? `linear-gradient(135deg, #4a0a0a, #2a0505)` : `linear-gradient(135deg, ${algo.color}33, ${algo.color}11)`,
          border: `1.5px solid ${blocked ? "#f87171" : algo.color}`,
          color: blocked ? "#f87171" : algo.color,
          fontSize: 12,
          fontFamily: "'Courier New', monospace",
          letterSpacing: "0.08em",
          cursor: firing ? "not-allowed" : "pointer",
          borderRadius: 4,
          transition: "all 0.2s ease",
          fontWeight: 600,
          boxShadow: blocked ? `0 0 12px #f8717144` : `0 0 12px ${algo.color}44`,
        }}>
          {blocked ? "── 429 BLOCKED ──" : firing ? "↻ firing..." : "▶ FIRE REQUEST"}
        </button>
        <button onClick={blast} disabled={firing} style={{
          padding: "11px 14px",
          background: `linear-gradient(135deg, #1a1a1a, #0f0f0f)`,
          border: `1.5px solid ${algo.color}66`,
          color: algo.color,
          fontSize: 12,
          fontFamily: "'Courier New', monospace",
          cursor: firing ? "not-allowed" : "pointer",
          borderRadius: 4,
          letterSpacing: "0.06em",
          fontWeight: 600,
          transition: "all 0.2s ease",
          boxShadow: `0 0 8px ${algo.color}33`,
        }}>
          ×8 BLAST
        </button>
      </div>

      {/* Log */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minHeight: 80 }}>
        {log.length === 0 ? (
          <div style={{ fontSize: 11, color: "#2a2a2a", paddingTop: 4 }}>
            — no requests fired yet —
          </div>
        ) : log.map((entry, i) => (
          <div key={i} style={{
            display: "flex",
            gap: 10,
            fontSize: 11,
            color: entry.allowed ? "#34d399" : "#f87171",
            opacity: 1 - i * 0.1,
          }}>
            <span style={{ color: "#333" }}>{entry.ts}</span>
            <span>
              {entry.allowed
                ? `HTTP 200 · ${entry.remaining} remaining`
                : `HTTP ${entry.status} · retry in ${entry.retryAfter ?? "?"}s`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Landing() {
  const [copied, setCopied] = useState(false);

  const snippet = `import { createRateLimiter } from './middleware/rateLimiter';

// Fixed window — 100 req/min by IP
app.use('/api', createRateLimiter({
  algorithm: 'sliding',
  limit: 100,
  windowMs: 60_000,
}));

// Token bucket — burst-friendly, like Stripe
app.post('/api/payment',
  createRateLimiter({
    algorithm: 'token',
    capacity: 10,
    refillRate: 2,
    failOpen: false,   // fail-closed on Redis outage
  }),
  paymentHandler
);`;

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #080808 0%, #0a0a0a 100%)",
      color: "#e8e8e8",
      fontFamily: "'Courier New', monospace",
    }}>
      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid #34d39933",
        padding: "16px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "linear-gradient(90deg, #080808, #0a1008)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#34d399",
            boxShadow: "0 0 8px #34d39966",
            animation: "pulse 2s ease-in-out infinite",
          }} />
          <span style={{ fontSize: 13, letterSpacing: "0.12em", color: "#34d399", fontWeight: 700 }}>
            ◄ RATE-LIMITER ►
          </span>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a href="https://github.com/Aditya-tec/distributed-rate-limiter"
            target="_blank" rel="noreferrer"
            style={{
              fontSize: 12, color: "#666", textDecoration: "none", letterSpacing: "0.06em",
              transition: "all 0.2s", padding: "6px 12px", borderRadius: 3,
              border: "1px solid #34d39944",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "#34d399";
              e.target.style.borderColor = "#34d399";
              e.target.style.boxShadow = "0 0 8px #34d39944";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "#666";
              e.target.style.borderColor = "#34d39944";
              e.target.style.boxShadow = "none";
            }}
          >
            GITHUB ↗
          </a>
          <Link href="/dashboard" style={{
            fontSize: 12, color: "#e8e8e8", textDecoration: "none",
            letterSpacing: "0.06em", border: "1px solid #2a2a2a",
            padding: "6px 14px", borderRadius: 2,
          }}>
            DASHBOARD →
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px 80px" }}>

        {/* Hero */}
        <div style={{ padding: "80px 0 60px", borderBottom: "1px solid #34d39933", marginBottom: 60, background: "linear-gradient(180deg, transparent 0%, #34d39906 50%, transparent 100%)" }}>
          <div style={{
            fontSize: 11, color: "#34d399", letterSpacing: "0.16em",
            marginBottom: 20,
            textShadow: "0 0 10px #34d39944",
          }}>
            ● PRODUCTION READY · 3 ALGORITHMS · ATOMIC LUA SCRIPTS · REAL-TIME DASHBOARD
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            margin: "0 0 24px",
            fontFamily: "'Courier New', monospace",
            background: "linear-gradient(135deg, #e8e8e8, #a78bfa, #34d399, #a78bfa)",
            backgroundSize: "300% 300%",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "gradient-shift 8s ease infinite",
          }}>
            Distributed<br />
            <span style={{ color: "#333" }}>Rate Limiting</span><br />
            done right.
          </h1>
          <p style={{
            fontSize: 16, color: "#555", lineHeight: 1.7,
            maxWidth: 520, margin: "0 0 36px",
            fontFamily: "system-ui, sans-serif",
          }}>
            Express middleware that intercepts every request, identifies the caller
            by API key or IP, runs an atomic Lua script in Redis, and either allows
            or blocks — with zero race conditions across any number of instances.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "No race conditions", desc: "Lua atomic ops", color: "#34d399" },
              { label: "3 algorithms", desc: "fixed · sliding · token", color: "#a78bfa" },
              { label: "Fail-safe", desc: "open or closed per route", color: "#fbbf24" },
              { label: "24 tests", desc: "real Redis in CI", color: "#f87171" },
            ].map((tag) => (
              <div key={tag.label} style={{
                border: `1px solid ${tag.color}44`,
                padding: "10px 16px",
                borderRadius: 4,
                fontSize: 12,
                background: `${tag.color}11`,
                boxShadow: `0 0 8px ${tag.color}22`,
                transition: "all 0.2s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 16px ${tag.color}44`;
                e.currentTarget.style.background = `${tag.color}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 0 8px ${tag.color}22`;
                e.currentTarget.style.background = `${tag.color}11`;
              }}
              >
                <span style={{ color: tag.color, fontWeight: 600 }}>{tag.label}</span>
                <span style={{ color: "#666", marginLeft: 8 }}>// {tag.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live demo */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: "0.16em", marginBottom: 8, textShadow: "0 0 10px #a78bfa44" }}>
              INTERACTIVE DEMO
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, background: "linear-gradient(135deg, #a78bfa, #34d399)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Fire real requests. Watch it block.
            </h2>
            <p style={{
              fontSize: 13, color: "#555", marginTop: 8,
              fontFamily: "system-ui, sans-serif",
            }}>
              These hit the live production API. Hit ×8 to drain the limit and trigger a 429.
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
          }}>
            {ALGORITHMS.map((algo) => (
              <AlgoCard key={algo.id} algo={algo} />
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 80, borderTop: "1px solid #34d39933", paddingTop: 60 }}>
          <div style={{ fontSize: 11, color: "#34d399", letterSpacing: "0.16em", marginBottom: 32, textShadow: "0 0 10px #34d39944" }}>
            HOW IT WORKS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {[
              { num: "①", title: "Identify caller", body: "x-api-key header takes priority. Falls back to x-forwarded-for then socket IP. Every caller gets a namespaced Redis key.", color: "#34d399" },
              { num: "②", title: "Atomic Lua script", body: "One script runs inside Redis. Read, decide, write — one indivisible operation. No race condition is possible regardless of instance count.", color: "#a78bfa" },
              { num: "③", title: "Headers always", body: "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset on every response. Retry-After on every 429.", color: "#fbbf24" },
              { num: "④", title: "Fail safely", body: "Redis down? Each route is configured to fail-open (allow) or fail-closed (block). Never a silent failure.", color: "#f87171" },
            ].map((item) => (
              <div key={item.num} style={{
                background: `linear-gradient(135deg, ${item.color}11, ${item.color}05)`,
                border: `1px solid ${item.color}33`,
                borderLeft: `3px solid ${item.color}`,
                borderTop: `1px solid #34d39933`,
                padding: 24,
                borderRadius: 4,
                boxShadow: `0 4px 12px ${item.color}11, inset 0 1px 0 ${item.color}22`,
                transition: "all 0.3s ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 8px 24px ${item.color}22, inset 0 1px 0 ${item.color}33`;
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 4px 12px ${item.color}11, inset 0 1px 0 ${item.color}22`;
                e.currentTarget.style.transform = "translateY(0)";
              }}
              >
                <div style={{ fontSize: 24, color: item.color, marginBottom: 12, fontWeight: 700 }}>
                  {item.num}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: item.color }}>
                  {item.title}
                </div>
                <p style={{ fontSize: 12, color: "#999", lineHeight: 1.7, margin: 0, fontFamily: "system-ui, sans-serif" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Code snippet */}
        <div style={{ marginBottom: 80, borderTop: "1px solid #a78bfa33", paddingTop: 60, paddingBottom: 60, borderBottom: "1px solid #a78bfa33", background: "linear-gradient(180deg, transparent 0%, #0f060833 50%, transparent 100%)" }}>
          <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: "0.16em", marginBottom: 8, textShadow: "0 0 10px #a78bfa44" }}>
            USAGE
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, background: "linear-gradient(135deg, #a78bfa, #34d399)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              One line to protect any route.
            </h2>
            <button onClick={copy} style={{
              background: copied ? "linear-gradient(135deg, #34d39933, #34d39911)" : "linear-gradient(135deg, #a78bfa33, #a78bfa11)",
              border: `1px solid ${copied ? "#34d399" : "#a78bfa"}`,
              color: copied ? "#34d399" : "#a78bfa",
              padding: "8px 16px",
              fontSize: 11,
              fontFamily: "'Courier New', monospace",
              letterSpacing: "0.08em",
              cursor: "pointer",
              borderRadius: 3,
              transition: "all 0.2s",
              fontWeight: 600,
              boxShadow: `0 0 8px ${copied ? "#34d39944" : "#a78bfa44"}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 12px ${copied ? "#34d39966" : "#a78bfa66"}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = `0 0 8px ${copied ? "#34d39944" : "#a78bfa44"}`;
            }}
            >
              {copied ? "COPIED ✓" : "COPY"}
            </button>
          </div>
          <pre style={{
            background: "linear-gradient(135deg, #0a0a0a, #0f0608)",
            border: "1px solid #a78bfa33",
            borderRadius: 4,
            padding: 28,
            fontSize: 12,
            lineHeight: 1.8,
            color: "#a0a0a0",
            overflowX: "auto",
            margin: 0,
            boxShadow: "0 0 20px #a78bfa11, inset 0 1px 0 #a78bfa22",
          }}>
            <code>{snippet.split('\n').map((line, i) => {
              const colored = line
                .replace(/(\/\/.*)/g, '<span style="color:#3a3a3a">$1</span>')
                .replace(/('.*?')/g, '<span style="color:#34d399">$1</span>')
                .replace(/\b(import|from|app|const)\b/g, '<span style="color:#a78bfa">$1</span>');
              return <span key={i} dangerouslySetInnerHTML={{ __html: colored + '\n' }} />;
            })}</code>
          </pre>
        </div>

        {/* Footer CTA */}
        <div style={{
          borderTop: "1px solid #34d39933",
          paddingTop: 60,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 24,
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6, background: "linear-gradient(135deg, #34d399, #34d399)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              See it live.
            </div>
            <div style={{ fontSize: 13, color: "#666", fontFamily: "system-ui, sans-serif" }}>
              Real-time charts, live event feed, top blocked identifiers.
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <a href="https://github.com/Aditya-tec/distributed-rate-limiter"
              target="_blank" rel="noreferrer"
              style={{
                padding: "10px 20px", border: "1px solid #34d39944",
                color: "#666", textDecoration: "none", fontSize: 13,
                fontFamily: "'Courier New', monospace", letterSpacing: "0.06em",
                borderRadius: 3,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#34d399";
                e.currentTarget.style.borderColor = "#34d399";
                e.currentTarget.style.boxShadow = "0 0 8px #34d39944";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#666";
                e.currentTarget.style.borderColor = "#34d39944";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              VIEW SOURCE ↗
            </a>
            <Link href="/dashboard" style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #34d39933, #34d39911)",
              border: "1px solid #34d399",
              color: "#34d399",
              textDecoration: "none",
              fontSize: 13,
              fontFamily: "'Courier New', monospace",
              letterSpacing: "0.06em",
              fontWeight: 700,
              borderRadius: 3,
              transition: "all 0.2s",
              boxShadow: "0 0 12px #34d39944",
            }}>
              OPEN DASHBOARD →
            </Link>
          </div>
        </div>

      </main>
    </div>
    <style>{`
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          box-shadow: 0 0 8px #34d39966;
        }
        50% {
          opacity: 0.4;
          box-shadow: 0 0 4px #34d39944;
        }
      }

      @keyframes gradient-shift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
    `}</style>
  );
}