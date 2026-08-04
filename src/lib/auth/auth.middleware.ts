import type { Context, Next } from "hono";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import { getSignedCookie } from "hono/cookie";
import type { TEnv } from "src/lib/dto/env.dto.js";
import { env } from "hono/adapter";
import jwtService from "src/v1/modules/auth/jwt.service.js";
import errorHandler from "src/lib/error.handler.js";

/**
 * Middleware to authenticate the user
 * @param {Context<TServerContext, any, {}>} c - The context
 * @param {Next} next - The next middleware/handler
 * @returns {Promise<void | Response>} The next middleware/handler
 * @throws {HTTPException} If the user is not authenticated
 */
export default async function AuthMiddleware(
  c: Context<TServerContext, any, {}>,
  next: Next,
): Promise<void | Response> {
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
  });
  if (!user) {
    throw errorHandler.httpError(401, "Unauthorized");
  }

  // Set the user in the context
  c.set("user", user);

  // Call the next middleware/handler
  return next();
}
