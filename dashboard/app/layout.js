export const metadata = {
  title: "Rate Limiter — Distributed · 3 Algorithms · Lua Atomic",
  description: "Production-grade distributed rate limiting middleware. Fixed window, sliding window, token bucket. Atomic Redis Lua scripts. Live demo.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#080808" }}>
        {children}
      </body>
    </html>
  );
}
