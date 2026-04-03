const extractIdentifier = (req) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    return { type: "apikey", value: `apikey:${apiKey}` };
  }

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip;

  return { type: "ip", value: `ip:${ip}` };
};

module.exports = { extractIdentifier };