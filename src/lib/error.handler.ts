import type { Context } from "hono";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import "dotenv/config";

class ErrorHandler {
  /**
   * Creates an HTTP error
   * @param {ContentfulStatusCode} status - The status code
   * @param {string} message - The error message
   * @param {Record<string, any>} meta - The error metadata
   * @returns {HTTPException} The HTTP exception
   */
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

  /**
   * Handles an error
   * @param {Context<TServerContext, any>} c - The context
   * @param {any} error - The error
   * @returns {Response} The response or the HTTP exception response
   */
  handle(c: Context<TServerContext, any>, error: any): Response {
    console.error("Error:", error);
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

    // Handle other errors
    throw this.httpError(500, "Internal server error");
  }
}

export default new ErrorHandler();
