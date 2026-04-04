"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0f0f0f", border: "1px solid #1e1e1e",
      padding: "10px 14px", fontSize: 11, fontFamily: "'Courier New', monospace",
    }}>
      <p style={{ color: "#555", marginBottom: 6, margin: "0 0 6px" }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{
          color: p.color, display: "flex", gap: 16,
          justifyContent: "space-between", margin: "3px 0",
        }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [events, setEvents] = useState([]);
  const feedRef = useRef(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/metrics`);
      setMetrics(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchMetrics();
    const t = setInterval(fetchMetrics, 5000);
    return () => clearInterval(t);
  }, [fetchMetrics]);

  useEffect(() => {
    const es = new EventSource(`${API}/admin/stream`);
    
    es.onopen = () => {
      console.log("✅ SSE Connected to /admin/stream");
    };
    
    es.onmessage = (e) => {
      console.log("📨 Received event:", e.data);
      try {
        const ev = JSON.parse(e.data);
        console.log("✅ Parsed event:", ev);
        setEvents((prev) => [ev, ...prev].slice(0, 100));
      } catch (err) {
        console.error("❌ Failed to parse event:", err, e.data);
      }
    };
    
    es.onerror = (err) => {
      console.error("❌ SSE Connection error:", err);
      es.close();
    };
    
    return () => es.close();
  }, []);

  const chartData = metrics?.timeline?.labels?.map((label, i) => ({
    time: label,
    Allowed: metrics.timeline.allowed[i],
    Blocked: metrics.timeline.blocked[i],
  })) || [];

  const total = (metrics?.summary?.totalAllowed || 0) + (metrics?.summary?.totalBlocked || 0);
  const redisOk = metrics?.redis?.healthy;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#d4d4d4",
      fontFamily: "'Courier New', monospace",
    }}>

      {/* Top bar */}
      <div style={{
        borderBottom: "1px solid #161616",
        padding: "14px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/" style={{
            fontSize: 11, color: "#555", textDecoration: "none",
            letterSpacing: "0.08em",
          }}>
            ← BACK
          </Link>
          <div style={{ width: 1, height: 14, background: "#1e1e1e" }} />
          <span style={{ fontSize: 12, color: "#888", letterSpacing: "0.06em" }}>
            RATE LIMITER  /  DASHBOARD
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: redisOk ? "#34d399" : "#f87171",
            display: "inline-block",
          }} />
          <span style={{ fontSize: 11, color: redisOk ? "#34d399" : "#f87171", letterSpacing: "0.06em" }}>
            Redis {redisOk ? "connected" : "disconnected"}
          </span>
          {metrics?.redis?.memory && (
            <span style={{ fontSize: 11, color: "#383838", marginLeft: 8 }}>
              {metrics.redis.memory}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>

        {/* Summary row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: "#141414",
          marginBottom: 24,
        }}>
          {[
            { label: "TOTAL", value: fmt(total), color: "#e8e8e8" },
            { label: "ALLOWED", value: fmt(metrics?.summary?.totalAllowed || 0), color: "#34d399" },
            { label: "BLOCKED", value: fmt(metrics?.summary?.totalBlocked || 0), color: "#f87171" },
            { label: "BLOCK RATE", value: `${metrics?.summary?.blockRate || "0.0"}%`, color: parseFloat(metrics?.summary?.blockRate) > 20 ? "#f87171" : "#e8e8e8" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#0c0c0c", padding: "22px 24px" }}>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", marginBottom: 10 }}>{label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Algorithm row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          background: "#141414",
          marginBottom: 24,
        }}>
          {[
            { key: "fixed", label: "FIXED WINDOW", color: "#e8e8e8" },
            { key: "sliding", label: "SLIDING WINDOW", color: "#a78bfa" },
            { key: "tokenBucket", label: "TOKEN BUCKET", color: "#34d399" },
          ].map(({ key, label, color }) => (
            <div key={key} style={{
              background: "#0c0c0c",
              padding: "20px 24px",
              borderTop: `2px solid ${color}`,
            }}>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", marginBottom: 10 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {fmt(metrics?.algorithms?.[key] || 0)}
                <span style={{ fontSize: 12, color: "#383838", fontWeight: 400, marginLeft: 6 }}>req</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{
          background: "#0c0c0c",
          border: "1px solid #141414",
          padding: "24px",
          marginBottom: 24,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 20,
          }}>
            <span style={{ fontSize: 12, color: "#888", letterSpacing: "0.06em" }}>REQUEST VOLUME — LAST 60 MIN</span>
            <div style={{ display: "flex", gap: 20, fontSize: 11, color: "#444" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 1.5, background: "#34d399", display: "inline-block" }} />
                Allowed
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 1.5, background: "#f87171", display: "inline-block" }} />
                Blocked
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#111111" strokeDasharray="0" />
              <XAxis dataKey="time" tick={{ fill: "#383838", fontSize: 10, fontFamily: "inherit" }}
                tickLine={false} axisLine={false} interval={9} />
              <YAxis tick={{ fill: "#383838", fontSize: 10, fontFamily: "inherit" }}
                tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Allowed" stroke="#34d399"
                strokeWidth={1.5} fill="url(#ga)" dot={false} />
              <Area type="monotone" dataKey="Blocked" stroke="#f87171"
                strokeWidth={1.5} fill="url(#gb)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#141414" }}>

          {/* Top blocked */}
          <div style={{ background: "#0c0c0c", padding: 24 }}>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", marginBottom: 16 }}>
              TOP BLOCKED IDENTIFIERS
            </div>
            {!metrics?.topBlocked?.length ? (
              <p style={{ color: "#2a2a2a", fontSize: 12, margin: 0, fontFamily: "system-ui, sans-serif" }}>
                No blocked requests recorded yet
              </p>
            ) : (
              <div>
                {metrics.topBlocked.map((item, i) => (
                  <div key={item.identifier} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 0",
                    borderBottom: i < metrics.topBlocked.length - 1 ? "1px solid #111" : "none",
                  }}>
                    <span style={{ fontSize: 11, color: "#777", fontFamily: "inherit" }}>
                      {item.identifier}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171" }}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live feed */}
          <div style={{ background: "#0c0c0c", padding: 24 }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em" }}>LIVE FEED</div>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#34d399", display: "inline-block",
                animation: "pulse 2s ease-in-out infinite",
              }} />
            </div>
            <div ref={feedRef} style={{
              display: "flex", flexDirection: "column",
              gap: 2, maxHeight: 300, overflowY: "auto",
            }}>
              {!events.length ? (
                <p style={{ color: "#2a2a2a", fontSize: 12, margin: 0, fontFamily: "system-ui, sans-serif" }}>
                  Waiting for requests...
                </p>
              ) : events.map((ev, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 8px",
                  background: ev.allowed ? "#080f0c" : "#0f0808",
                  borderLeft: `2px solid ${ev.allowed ? "#34d39933" : "#f8717133"}`,
                }}>
                  <span style={{ fontSize: 10, color: ev.allowed ? "#34d399" : "#f87171", fontFamily: "inherit" }}>
                    {ev.identifier}
                  </span>
                  <span style={{ fontSize: 10, color: "#383838", whiteSpace: "nowrap", marginLeft: 12 }}>
                    {ev.algorithm} · {ev.remaining} left
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; }
      `}</style>
    </div>
  );
}