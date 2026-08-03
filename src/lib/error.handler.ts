import type { Context } from "hono";
import type { ContextWithPrisma } from "./prisma.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import "dotenv/config";

class ErrorHandler {
  httpError(
    status: ContentfulStatusCode,
    message: string,
    meta: Record<string, any> = {},
  ): HTTPException {
    return new HTTPException(status, {
      res: new Response(JSON.stringify({ message: message, ...meta }), {
        status: status,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    });
  }

  handle(c: Context<ContextWithPrisma, any, {}>, error: any): Response {
    // Handle HTTP exceptions
    if (error instanceof HTTPException) {
      return error.getResponse();
    }

    // Handle Prisma client known request errors
    if (error instanceof PrismaClientKnownRequestError) {
      const NODE_ENV = process.env.NODE_ENV || "production";

      switch (error.code) {
        case "P2025":
          throw this.httpError(
            404,
            `Record ${error.meta?.modelName ?? "unknown"} not found`,
            NODE_ENV === "development" ? { error: error.message } : {},
          );
        default:
          throw this.httpError(500, "Internal server error");
      }
    }
    throw this.httpError(500, "Internal server error");
  }
}

export default new ErrorHandler();
