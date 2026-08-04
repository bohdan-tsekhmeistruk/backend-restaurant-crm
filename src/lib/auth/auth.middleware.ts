import type { Context, Next } from "hono";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import { getSignedCookie } from "hono/cookie";
import type { TEnv } from "src/lib/dto/env.dto.js";
import { env } from "hono/adapter";
import jwtService from "src/v1/modules/auth/jwt.service.js";
import errorHandler from "src/lib/error.handler.js";
import { UserRole } from "src/generated/prisma/client.js";
import type { TValidatedUserResponse } from "./interfaces/auth.interface.js";

/**
 * Middleware to authenticate the user
 * @param {Context<TServerContext, any, {}>} c - The context
 * @param {Next} next - The next middleware/handler
 * @returns {Promise<void | Response>} The next middleware/handler
 * @throws {HTTPException} If the user is not authenticated
 */
export async function AuthMiddleware(
  c: Context<TServerContext, any, {}>,
  next: Next,
): Promise<void | Response> {
  // Validate the token
  const user = await _validateToken(c);

  if (user.role !== UserRole.USER && user.role !== UserRole.ADMIN) {
    throw errorHandler.httpError(
      403,
      "You are not authorized to access this resource",
    );
  }

  // Call the next middleware/handler
  return next();
}

export async function AdminAuthMiddleware(
  c: Context<TServerContext, any, {}>,
  next: Next,
): Promise<void | Response> {
  // Validate the token
  const user = await _validateToken(c);

  if (user.role !== UserRole.ADMIN) {
    throw errorHandler.httpError(
      403,
      "You are not authorized to access this resource",
    );
  }

  // Call the next middleware/handler
  return next();
}

/**
 * Validate the token
 * @param {Context<TServerContext, any, {}>} c - The context
 * @returns {Promise<TValidatedUserResponse>} Object of the user
 * @throws {HTTPException} If the user is not authenticated
 */
async function _validateToken(
  c: Context<TServerContext, any, {}>,
): Promise<TValidatedUserResponse> {
  // Get the Prisma client
  const prisma = c.get("prisma");
  if (!prisma) {
    throw errorHandler.httpError(500, "Internal server error");
  }

  const envVars = env<TEnv>(c);
  // Get the access token from the cookies
  const accessToken = await getSignedCookie(
    c,
    envVars.COOKIE_SECRET,
    "accessToken",
  );
  if (!accessToken) {
    throw errorHandler.httpError(401, "Unauthorized");
  }

  // Verify the access token
  const accessTokenPayload = await jwtService.verifyToken(
    accessToken,
    envVars.ACCESS_TOKEN_SECRET,
  );
  if (!accessTokenPayload || typeof accessTokenPayload.userId !== "string") {
    throw errorHandler.httpError(401, "Unauthorized");
  }

  // Get the user from the database
  const user = await prisma.user.findUnique({
    where: {
      id: accessTokenPayload.userId,
    },
    omit: {
      password: true,
    },
  });
  if (!user) {
    throw errorHandler.httpError(401, "Unauthorized");
  }

  // Set the user in the context
  c.set("user", user);

  return user;
}
