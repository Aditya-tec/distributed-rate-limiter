"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const API = "http://localhost:5000";

const ALGO_META = {
  fixed:       { label: "Fixed window",   color: "#e8e8e8" },
  sliding:     { label: "Sliding window", color: "#a78bfa" },
  tokenBucket: { label: "Token bucket",   color: "#34d399" },
};

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const StatCard = ({ label, value, sub, accent }) => (
  <div style={{
    background: "#0f0f0f",
    border: "1px solid #1c1c1c",
    borderRadius: 8,
    padding: "20px 24px",
  }}>
    <p style={{ color: "#666", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
      {label}
    </p>
    <p style={{ fontSize: 28, fontWeight: 600, color: accent || "#e8e8e8", letterSpacing: "-0.02em" }}>
      {value}
    </p>
    {sub && <p style={{ color: "#444", fontSize: 12, marginTop: 4 }}>{sub}</p>}
  </div>
);

const Pill = ({ ok }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    background: ok ? "#0a1a0f" : "#1a0a0a",
    border: `1px solid ${ok ? "#1a3a22" : "#3a1a1a"}`,
    color: ok ? "#34d399" : "#f87171",
    borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 500,
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: "50%",
      background: ok ? "#34d399" : "#f87171",
      boxShadow: ok ? "0 0 6px #34d39966" : "0 0 6px #f8717166",
    }} />
    Redis {ok ? "connected" : "disconnected"}
  </span>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#111", border: "1px solid #222",
      borderRadius: 6, padding: "10px 14px", fontSize: 12,
    }}>
      <p style={{ color: "#666", marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, display: "flex", gap: 12, justifyContent: "space-between" }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
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
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      setEvents((prev) => [ev, ...prev].slice(0, 100));
    };
    return () => es.close();
  }, []);

  const chartData = metrics?.timeline?.labels?.map((label, i) => ({
    time: label,
    Allowed: metrics.timeline.allowed[i],
    Blocked: metrics.timeline.blocked[i],
  })) || [];

  const totalReqs = (metrics?.summary?.totalAllowed || 0) + (metrics?.summary?.totalBlocked || 0);

  return (
    <div style={{ minHeight: "100vh", padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "#e8e8e8" }}>
            Rate Limiter
          </h1>
          <p style={{ color: "#444", fontSize: 12, marginTop: 2 }}>
            Distributed · 3 algorithms · Lua atomic ops
          </p>
        </div>
        <Pill ok={metrics?.redis?.healthy} />
      </div>

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
        <StatCard label="Total requests" value={fmt(totalReqs)} />
        <StatCard label="Allowed" value={fmt(metrics?.summary?.totalAllowed || 0)} accent="#34d399" />
        <StatCard label="Blocked" value={fmt(metrics?.summary?.totalBlocked || 0)} accent="#f87171" />
        <StatCard label="Block rate" value={`${metrics?.summary?.blockRate || "0.0"}%`}
          accent={parseFloat(metrics?.summary?.blockRate) > 20 ? "#f87171" : "#e8e8e8"}
          sub={`Redis ${metrics?.redis?.memory || "—"}`} />
      </div>

      {/* Algorithm row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {Object.entries(ALGO_META).map(([key, meta]) => (
          <div key={key} style={{
            background: "#0f0f0f",
            border: "1px solid #1c1c1c",
            borderRadius: 8,
            padding: "16px 24px",
            borderLeft: `2px solid ${meta.color}`,
          }}>
            <p style={{ color: "#555", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
              {meta.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 600, color: meta.color, letterSpacing: "-0.02em" }}>
              {fmt(metrics?.algorithms?.[key] || 0)}
              <span style={{ fontSize: 13, color: "#444", fontWeight: 400, marginLeft: 4 }}>req</span>
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{
        background: "#0f0f0f", border: "1px solid #1c1c1c",
        borderRadius: 8, padding: "24px", marginBottom: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#e8e8e8" }}>Request volume</p>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#555" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 20, height: 1.5, background: "#34d399", display: "inline-block" }} />
              Allowed
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 20, height: 1.5, background: "#f87171", display: "inline-block" }} />
              Blocked
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#161616" strokeDasharray="0" />
            <XAxis dataKey="time" tick={{ fill: "#444", fontSize: 11 }} tickLine={false} axisLine={false} interval={9} />
            <YAxis tick={{ fill: "#444", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Allowed" stroke="#34d399" strokeWidth={1.5} fill="url(#ga)" dot={false} />
            <Area type="monotone" dataKey="Blocked" stroke="#f87171" strokeWidth={1.5} fill="url(#gb)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* Top blocked */}
        <div style={{ background: "#0f0f0f", border: "1px solid #1c1c1c", borderRadius: 8, padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#e8e8e8", marginBottom: 16 }}>Top blocked</p>
          {!metrics?.topBlocked?.length ? (
            <p style={{ color: "#333", fontSize: 13 }}>No blocked requests recorded</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {metrics.topBlocked.map((item, i) => (
                <div key={item.identifier} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0",
                  borderBottom: i < metrics.topBlocked.length - 1 ? "1px solid #161616" : "none",
                }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "#888" }}>
                    {item.identifier}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#f87171" }}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live feed */}
        <div style={{ background: "#0f0f0f", border: "1px solid #1c1c1c", borderRadius: 8, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#e8e8e8" }}>Live feed</p>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#34d399",
              boxShadow: "0 0 8px #34d39988",
              animation: "pulse 2s ease-in-out infinite",
            }} />
          </div>
          <div ref={feedRef} style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 280, overflowY: "auto" }}>
            {!events.length ? (
              <p style={{ color: "#333", fontSize: 13 }}>Waiting for requests...</p>
            ) : events.map((ev, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "5px 8px", borderRadius: 4,
                background: ev.allowed ? "#0a1a0f" : "#1a0a0a",
              }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: ev.allowed ? "#34d399" : "#f87171" }}>
                  {ev.identifier}
                </span>
                <span style={{ fontSize: 11, color: "#444", whiteSpace: "nowrap", marginLeft: 12 }}>
                  {ev.algorithm} · {ev.remaining} left
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}