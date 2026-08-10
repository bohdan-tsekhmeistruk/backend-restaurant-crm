import { describe, expect, it } from "vitest";
import jwtService from "src/v1/modules/auth/jwt.service.js";

const SECRET = "jwt-unit-test-secret";

describe("JwtService", () => {
  describe("issueToken / verifyToken", () => {
    it("round-trips the userId through a signed access token", async () => {
      const token = await jwtService.issueToken("user-123", SECRET);

      const payload = await jwtService.verifyToken(token, SECRET);

      expect(payload.userId).toBe("user-123");
    });

    it("issues tokens valid for 15 minutes", async () => {
      const before = Math.floor(Date.now() / 1000);
      const token = await jwtService.issueToken("user-123", SECRET);
      const payload = await jwtService.verifyToken(token, SECRET);

      expect(payload.exp! - payload.iat!).toBe(15 * 60);
      expect(payload.iat!).toBeGreaterThanOrEqual(before);
    });

    it("rejects a token signed with a different key", async () => {
      const token = await jwtService.issueToken("user-123", SECRET);

      await expect(
        jwtService.verifyToken(token, "another-secret"),
      ).rejects.toThrow();
    });

    it("rejects verification with the wrong algorithm", async () => {
      const token = await jwtService.issueToken("user-123", SECRET);

      await expect(
        jwtService.verifyToken(token, SECRET, "refresh"),
      ).rejects.toThrow();
    });

    it("rejects a malformed token", async () => {
      await expect(jwtService.verifyToken("garbage", SECRET)).rejects.toThrow();
    });
  });

  describe("issueRefreshToken", () => {
    it("generates a 64-byte base64url token", () => {
      const token = jwtService.issueRefreshToken();

      // 64 bytes → 86 base64url characters without padding
      expect(token).toMatch(/^[A-Za-z0-9_-]{86}$/);
    });

    it("generates unique tokens", () => {
      const tokens = new Set(
        Array.from({ length: 100 }, () => jwtService.issueRefreshToken()),
      );
      expect(tokens.size).toBe(100);
    });
  });
});
