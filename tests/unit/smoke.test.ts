import { describe, expect, it } from "vitest";
import jwtService from "src/v1/modules/auth/jwt.service.js";
import errorHandler from "src/lib/error.handler.js";

describe("smoke: module resolution", () => {
  it("resolves src/* alias imports with .js extension", async () => {
    const token = await jwtService.issueToken(
      "user-id",
      process.env.ACCESS_TOKEN_SECRET!,
    );
    expect(typeof token).toBe("string");

    const err = errorHandler.httpError(418, "teapot");
    expect(err.status).toBe(418);
  });
});
