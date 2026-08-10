import { describe, expect, it, vi } from "vitest";
import { z } from "@hono/zod-openapi";
import {
  cookieSecurity,
  errorResponse,
  jsonContent,
  noContent,
  openAPIDefaultHook,
  OrderStatusSchema,
  refreshCookieSecurity,
  UserRoleSchema,
  UserStatusSchema,
} from "src/lib/openapi.js";

describe("openapi helpers", () => {
  describe("openAPIDefaultHook", () => {
    it("returns undefined when validation succeeds", () => {
      const c = { json: vi.fn() };
      const result = openAPIDefaultHook({ success: true } as any, c as any);

      expect(result).toBeUndefined();
      expect(c.json).not.toHaveBeenCalled();
    });

    it("returns a 400 JSON response with zod issues on failure", () => {
      const issues = [{ path: ["email"], message: "Invalid email" }];
      const c = { json: vi.fn((body: unknown, status: number) => ({ body, status })) };

      const result = openAPIDefaultHook(
        { success: false, error: { issues } } as any,
        c as any,
      );

      expect(c.json).toHaveBeenCalledWith({ message: issues }, 400);
      expect(result).toEqual({ body: { message: issues }, status: 400 });
    });
  });

  describe("response helpers", () => {
    it("jsonContent wraps the schema in an application/json content object", () => {
      const schema = z.object({ ok: z.boolean() });
      expect(jsonContent(schema, "fine")).toEqual({
        description: "fine",
        content: { "application/json": { schema } },
      });
    });

    it("noContent returns only a description", () => {
      expect(noContent("gone")).toEqual({ description: "gone" });
    });

    it("errorResponse returns only a description", () => {
      expect(errorResponse("bad")).toEqual({ description: "bad" });
    });

    it("exposes cookie security presets", () => {
      expect(cookieSecurity).toEqual([{ cookieAuth: [] }]);
      expect(refreshCookieSecurity).toEqual([{ refreshCookieAuth: [] }]);
    });
  });

  describe("enum schemas", () => {
    it("UserRoleSchema accepts known roles and rejects others", () => {
      expect(UserRoleSchema.parse("ADMIN")).toBe("ADMIN");
      expect(UserRoleSchema.parse("USER")).toBe("USER");
      expect(() => UserRoleSchema.parse("ROOT")).toThrow();
    });

    it("UserStatusSchema accepts known statuses and rejects others", () => {
      for (const status of ["ACTIVE", "BLOCKED", "DELETED"]) {
        expect(UserStatusSchema.parse(status)).toBe(status);
      }
      expect(() => UserStatusSchema.parse("ARCHIVED")).toThrow();
    });

    it("OrderStatusSchema accepts the full order lifecycle", () => {
      for (const status of [
        "PENDING",
        "COOKING",
        "READY_FOR_PICKUP",
        "DELIVERING",
        "DELIVERED",
        "COMPLETED",
        "CANCELLED",
        "REFUNDED",
      ]) {
        expect(OrderStatusSchema.parse(status)).toBe(status);
      }
      expect(() => OrderStatusSchema.parse("LOST")).toThrow();
    });
  });
});
