const http = require("http");

const config = {
  host: "localhost",
  port: 5000,
  requests: 20,
  delayMs: 100,
};

const makeRequest = (i) =>
  new Promise((resolve) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: "/demo/public",
      method: "GET",
      headers: { "x-api-key": "loadtest-key" },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        const status = res.statusCode === 200 ? "✅ allowed" : "🚫 blocked";
        console.log(`Request ${String(i).padStart(2, "0")}: ${status} (HTTP ${res.statusCode})`);
        resolve();
      });
    });

    req.on("error", () => {
      console.log(`Request ${i}: ❌ error`);
      resolve();
    });

    req.end();
  });

const run = async () => {
  console.log(`\n🚀 Load test — ${config.requests} requests, ${config.delayMs}ms apart\n`);
  for (let i = 1; i <= config.requests; i++) {
    await makeRequest(i);
    await new Promise((r) => setTimeout(r, config.delayMs));
  }
  console.log("\n✅ Done. Check http://localhost:5000/admin/metrics\n");
};

run();