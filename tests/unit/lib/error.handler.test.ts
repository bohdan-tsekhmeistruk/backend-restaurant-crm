import { describe, expect, it, vi } from "vitest";
import { HTTPException } from "hono/http-exception";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import errorHandler from "src/lib/error.handler.js";

const fakeContext = {} as any;

describe("ErrorHandler", () => {
  describe("httpError", () => {
    it("creates an HTTPException with the given status and JSON message", async () => {
      const error = errorHandler.httpError(404, "Not here");

      expect(error).toBeInstanceOf(HTTPException);
      const response = error.getResponse();
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ message: "Not here" });
    });

    it("merges meta into the response body", async () => {
      const error = errorHandler.httpError(400, "Bad", { field: "email" });
      await expect(error.getResponse().json()).resolves.toEqual({
        message: "Bad",
        field: "email",
      });
    });
  });

  describe("handle", () => {
    it("returns the response of an HTTPException as-is", async () => {
      const exception = errorHandler.httpError(403, "Forbidden zone");
      const response = errorHandler.handle(fakeContext, exception);

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        message: "Forbidden zone",
      });
    });

    it("converts Prisma P2025 into a 404 with the model name", async () => {
      const prismaError = new PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "7.9.1",
        meta: { modelName: "Product" },
      });

      try {
        errorHandler.handle(fakeContext, prismaError);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(HTTPException);
        const response = (error as HTTPException).getResponse();
        expect(response.status).toBe(404);
        // NODE_ENV is "development" in tests, so the raw error is included
        await expect(response.json()).resolves.toMatchObject({
          message: "Record Product not found",
          error: expect.any(String),
        });
      }
    });

    it("falls back to 'unknown' when P2025 has no model name", async () => {
      const prismaError = new PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "7.9.1",
      });

      try {
        errorHandler.handle(fakeContext, prismaError);
        expect.unreachable();
      } catch (error) {
        const response = (error as HTTPException).getResponse();
        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toMatchObject({
          message: "Record unknown not found",
        });
      }
    });

    it("converts other Prisma known errors into a 500", async () => {
      const prismaError = new PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "7.9.1",
      });

      try {
        errorHandler.handle(fakeContext, prismaError);
        expect.unreachable();
      } catch (error) {
        const response = (error as HTTPException).getResponse();
        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
          message: "Internal server error",
        });
      }
    });

    it("converts unknown errors into a 500", async () => {
      try {
        errorHandler.handle(fakeContext, new Error("boom"));
        expect.unreachable();
      } catch (error) {
        const response = (error as HTTPException).getResponse();
        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
          message: "Internal server error",
        });
      }
    });

    it("logs the error to the console", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const exception = errorHandler.httpError(400, "x");

      errorHandler.handle(fakeContext, exception);

      expect(spy).toHaveBeenCalledWith("Error:", exception);
      spy.mockRestore();
    });
  });
});
