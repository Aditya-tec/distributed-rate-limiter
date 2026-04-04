const { extractIdentifier } = require("../src/utils/identifier");

describe("identifier extraction", () => {
  it("extracts API key when x-api-key header is present", () => {
    const req = { headers: { "x-api-key": "abc123" }, socket: {}, ip: "" };
    const result = extractIdentifier(req);
    expect(result.type).toBe("apikey");
    expect(result.value).toBe("apikey:abc123");
  });

  it("falls back to IP when no API key", () => {
    const req = { headers: {}, socket: { remoteAddress: "1.2.3.4" }, ip: "" };
    const result = extractIdentifier(req);
    expect(result.type).toBe("ip");
    expect(result.value).toBe("ip:1.2.3.4");
  });

  it("uses x-forwarded-for first IP when present", () => {
    const req = {
      headers: { "x-forwarded-for": "9.9.9.9, 1.1.1.1" },
      socket: { remoteAddress: "127.0.0.1" },
      ip: "",
    };
    const result = extractIdentifier(req);
    expect(result.value).toBe("ip:9.9.9.9");
  });

  it("API key takes priority over x-forwarded-for", () => {
    const req = {
      headers: { "x-api-key": "mykey", "x-forwarded-for": "9.9.9.9" },
      socket: {},
      ip: "",
    };
    const result = extractIdentifier(req);
    expect(result.type).toBe("apikey");
    expect(result.value).toBe("apikey:mykey");
  });
});