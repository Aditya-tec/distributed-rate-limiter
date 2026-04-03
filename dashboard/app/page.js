"use client";
import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const API = "http://localhost:5000";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/metrics`);
      const data = await res.json();
      setMetrics(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  // Poll metrics every 5 seconds
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // SSE live event feed
  useEffect(() => {
    const es = new EventSource(`${API}/admin/stream`);
    es.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setEvents((prev) => [event, ...prev].slice(0, 50));
    };
    return () => es.close();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      Loading...
    </div>
  );

  const chartData = metrics?.timeline?.labels?.map((label, i) => ({
    time: label,
    allowed: metrics.timeline.allowed[i],
    blocked: metrics.timeline.blocked[i],
  })) || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Rate Limiter Dashboard</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            metrics?.redis?.healthy ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
          }`}>
            Redis {metrics?.redis?.healthy ? "● connected" : "● disconnected"}
          </span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total allowed", value: metrics?.summary?.totalAllowed ?? 0, color: "text-green-400" },
            { label: "Total blocked", value: metrics?.summary?.totalBlocked ?? 0, color: "text-red-400" },
            { label: "Block rate", value: `${metrics?.summary?.blockRate ?? "0.0"}%`, color: "text-yellow-400" },
            { label: "Redis memory", value: metrics?.redis?.memory ?? "—", color: "text-blue-400" },
          ].map((card) => (
            <div key={card.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-gray-400 text-sm">{card.label}</p>
              <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Algorithm counts */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Fixed window", key: "fixed", color: "border-blue-500" },
            { label: "Sliding window", key: "sliding", color: "border-purple-500" },
            { label: "Token bucket", key: "tokenBucket", color: "border-yellow-500" },
          ].map((algo) => (
            <div key={algo.key} className={`bg-gray-900 rounded-xl p-4 border-l-4 ${algo.color} border-t border-r border-b border-gray-800`}>
              <p className="text-gray-400 text-sm">{algo.label}</p>
              <p className="text-2xl font-bold mt-1">{metrics?.algorithms?.[algo.key] ?? 0} requests</p>
            </div>
          ))}
        </div>

        {/* Timeline chart */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Requests — last 60 minutes</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" tick={{ fill: "#9CA3AF", fontSize: 11 }}
                interval={9} />
              <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} />
              <Legend />
              <Line type="monotone" dataKey="allowed" stroke="#34D399"
                strokeWidth={2} dot={false} name="Allowed" />
              <Line type="monotone" dataKey="blocked" stroke="#F87171"
                strokeWidth={2} dot={false} name="Blocked" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top blocked */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Top blocked identifiers</h2>
            {metrics?.topBlocked?.length === 0 ? (
              <p className="text-gray-500 text-sm">No blocked requests yet</p>
            ) : (
              <div className="space-y-2">
                {metrics?.topBlocked?.map((item) => (
                  <div key={item.identifier}
                    className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-sm font-mono text-gray-300">{item.identifier}</span>
                    <span className="text-red-400 font-bold text-sm">{item.count} blocks</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live event feed */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">
              Live feed
              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-gray-500 text-sm">Waiting for requests...</p>
              ) : (
                events.map((ev, i) => (
                  <div key={i} className={`flex justify-between text-xs py-1 px-2 rounded font-mono ${
                    ev.allowed ? "bg-green-950 text-green-300" : "bg-red-950 text-red-300"
                  }`}>
                    <span>{ev.allowed ? "✅" : "🚫"} {ev.identifier}</span>
                    <span className="text-gray-500">{ev.algorithm} · {ev.remaining} left</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}