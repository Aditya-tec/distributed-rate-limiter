import "./globals.css";

export const metadata = {
  title: "Rateflow — distributed rate limiting",
  description: "Production-grade distributed rate limiting with live observability.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <style>{`
          .site-nav { height: 64px; }
          .brand { font-size: 17px; }
          .brand-mark { transform: scale(.85); transform-origin: left center; }
          .nav-links { gap: 16px; font-size: 11px; }
          .nav-cta { padding: 7px 9px; }
          .product-hero { padding-top: 76px; padding-bottom: 64px; }
          .hero h1 { font-size: clamp(42px, 6vw, 68px); margin: 17px 0; }
          .hero-copy { max-width: 520px; font-size: 15px; }
          .hero-actions { margin-top: 22px; gap: 18px; }
          .primary-cta, .request-row button, .evidence-line a { padding: 9px 11px; font-size: 11px; gap: 8px; }
          .text-cta { font-size: 12px; }
          .decision-strip { margin-top: 50px; padding-top: 14px; font-size: 10px; }
          .demo-section { padding-top: 55px; padding-bottom: 62px; }
          .section-heading { margin-bottom: 20px; }
          .section-heading h2, .code-copy h2 { font-size: 29px; }
          .section-heading > p { font-size: 13px; }
          .request-row { padding: 16px 0; gap: 15px; }
          .route-name strong { font-size: 14px; }
          .request-row code { padding: 5px 6px; font-size: 10px; }
          .route-limit strong { font-size: 15px; }
          .evidence-line { padding-top: 15px; font-size: 12px; }
          .flow-section { padding-top: 65px; padding-bottom: 68px; }
          .flow-grid { gap: 32px; margin-top: 30px; }
          .flow-grid h3 { font-size: 18px; margin: 14px 0 7px; }
          .flow-grid p, .code-copy > p:not(.route-label) { font-size: 13px; }
          .code-section { gap: 48px; padding-top: 66px; padding-bottom: 70px; }
          .code-window pre { padding: 17px; font-size: 11px; }
          .code-top { padding: 9px 12px; }
          .console-main { padding: 32px; }
          .console-header { margin-bottom: 23px; }
          .metric-card { padding: 13px 15px; }
          .metric-card strong { font-size: 25px; margin: 6px 0 2px; }
          .traffic-panel, .algorithm-panel, .activity-panel { padding: 17px; }
          @media (max-width: 800px) { .product-hero { padding-top: 58px; padding-bottom: 52px; } .hero h1 { font-size: 42px; } .request-row { gap: 10px; } .console-main { padding: 22px 16px; } }

          .site-shell, .console-shell { position: relative; isolation: isolate; }
          .site-shell::before, .console-shell::before {
            content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
            background-image: linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px);
            background-size: 32px 32px; mask-image: linear-gradient(to bottom, #000, transparent 85%);
            animation: matrix-grid 14s linear infinite;
          }
          .site-shell::after, .console-shell::after {
            content: ""; position: fixed; inset: 0; z-index: 20; pointer-events: none; opacity: .18;
            background: repeating-linear-gradient(to bottom, #ffffff08 0, #ffffff08 1px, transparent 1px, transparent 4px);
          }
          .site-nav, .request-row, .code-window, .metric-card, .traffic-panel, .algorithm-panel, .activity-panel { border-color: #ffffff38; }
          .route-label, .decision-strip, .request-row code, .code-top, .breadcrumb, .console-workspace > span, .panel-heading > div > span { font-family: "Courier New", monospace; letter-spacing: .8px; }
          .route-label::before { content: "> "; color: #fff; }
          .hero h1, .section-heading h2, .code-copy h2 { text-shadow: 2px 0 #ffffff1f, -2px 0 #ffffff12; }
          .primary-cta, .request-row button, .evidence-line a, .nav-cta { position: relative; text-transform: uppercase; letter-spacing: .7px; }
          .primary-cta::after, .request-row button::after, .evidence-line a::after, .nav-cta::after { content: ""; position: absolute; inset: 2px; border: 1px solid #05050533; pointer-events: none; }
          .request-row:hover { background: linear-gradient(90deg, #ffffff08, transparent 72%); }
          .request-row:hover .route-name strong, .request-row:hover code { color: #fff; }
          .decision-strip strong, .decision b { animation: signal 2.4s steps(2, end) infinite; }
          .brand-mark i { box-shadow: 0 0 7px #fff8; }
          .code-window pre::selection { background: #fff; color: #000; }
          @keyframes matrix-grid { from { background-position: 0 0, 0 0; } to { background-position: 0 32px, 32px 0; } }
          @keyframes signal { 0%, 88%, 100% { opacity: 1; } 90% { opacity: .45; } 93% { opacity: .8; } }
          @media (prefers-reduced-motion: reduce) { .site-shell::before, .decision-strip strong, .decision b { animation: none; } }
        `}</style>
      </body>
    </html>
  );
}
