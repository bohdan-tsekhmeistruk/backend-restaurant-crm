import type { Context } from "hono";
import type { BlankInput } from "hono/types";
import type { ContextWithPrisma } from "src/lib/prisma.js";
import authService from "./auth.service.js";
import { getConnInfo } from "@hono/node-server/conninfo";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { env } from "hono/adapter";
import type { TEnv } from "src/lib/dto/env.dto.js";
import errorHandler from "src/lib/error.handler.js";

class AuthController {
  /**
   * Logs in a user and returns a JSON response with auth response object
   * @param {Context<ContextWithPrisma, "/login", BlankInput>} c - Context object
   * @returns {Promise<Response>} JSON response with auth response object
   * @throws {HTTPException} 401 - Invalid credentials
   * @throws {HTTPException} 500 - Internal server error
   */
  async login(c: Context<ContextWithPrisma, "/login", BlankInput>) {
    try {
      const prisma = c.get("prisma");
      const connInfo = getConnInfo(c);
      const envVars = env<TEnv>(c);

      const { email, password } = await c.req.json();

      const response = await authService.login(prisma, envVars, {
        email,
        password,
        ipAddress: connInfo.remote.address,
        userAgent: c.req.header("user-agent"),
      });

      // Set the cookies
      await Promise.all([
        setSignedCookie(
          c,
          "accessToken",
          response.accessToken,
          envVars.COOKIE_SECRET,
          {
            httpOnly: true,
            secure: envVars.NODE_ENV === "production",
            maxAge: 15 * 60, // 15 minutes
            path: "/",
            sameSite: "strict",
          },
        ),
        setSignedCookie(
          c,
          "refreshToken",
          response.refreshToken,
          envVars.COOKIE_SECRET,
          {
            httpOnly: true,
            secure: envVars.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: "/",
            sameSite: "strict",
          },
        ),
      ]);

      return c.json(response, 200);
    } catch (error) {
      errorHandler.handle(c, error);
    }
  }

  /**
   * Registers a new user and returns a JSON response with auth response object
   * @param {Context<ContextWithPrisma, "/register", BlankInput>} c - Context object
   * @returns {Promise<Response>} JSON response with auth response object
   * @throws {HTTPException} 400 - User already exists with this email
   * @throws {HTTPException} 500 - Internal server error
   */
  async register(c: Context<ContextWithPrisma, "/register", BlankInput>) {
    try {
      const prisma = c.get("prisma");
      const connInfo = getConnInfo(c);
      const envVars = env<TEnv>(c);
      const { email, password, firstName, lastName, phone } =
        await c.req.json();

      // Execute the registration service
      const response = await authService.register(prisma, envVars, {
        email,
        password,
        firstName,
        lastName,
        phone,
        ipAddress: connInfo.remote.address,
        userAgent: c.req.header("user-agent"),
      });

      // Set the cookies
      await Promise.all([
        setSignedCookie(
          c,
          "accessToken",
          response.accessToken,
          envVars.COOKIE_SECRET,
          {
            httpOnly: true,
            secure: envVars.NODE_ENV === "production",
            maxAge: 15 * 60, // 15 minutes
            path: "/",
            sameSite: "strict",
          },
        ),
        setSignedCookie(
          c,
          "refreshToken",
          response.refreshToken,
          envVars.COOKIE_SECRET,
          {
            httpOnly: true,
            secure: envVars.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: "/",
            sameSite: "strict",
          },
        ),
      ]);

      return c.json(response, 201);
    } catch (error) {
      errorHandler.handle(c, error);
    }
  }

  /**
   * Refreshes a token and returns a JSON response with auth response object
   * @param {Context<ContextWithPrisma, "/refresh-token", BlankInput>} c - Context object
   * @returns {Promise<Response>} JSON response with auth response object
   * @throws {HTTPException} 401 - Unauthorized
   * @throws {HTTPException} 500 - Internal server error
   */
  async refreshToken(
    c: Context<ContextWithPrisma, "/refresh-token", BlankInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const connInfo = getConnInfo(c);
      const envVars = env<TEnv>(c);
      const user = c.get("user");
      if (!user) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const refreshToken = await getSignedCookie(
        c,
        envVars.COOKIE_SECRET,
        "refreshToken",
      );
      if (!refreshToken) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const response = await authService.refreshToken(prisma, envVars, user, {
        refreshToken,
        ipAddress: connInfo.remote.address,
        userAgent: c.req.header("user-agent"),
      });

      // Set the cookies
      await setSignedCookie(
        c,
        "accessToken",
        response.accessToken,
        envVars.COOKIE_SECRET,
        {
          httpOnly: true,
          secure: envVars.NODE_ENV === "production",
          maxAge: 15 * 60, // 15 minutes
          path: "/",
          sameSite: "strict",
        },
      );

      return c.body(null, 204);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }
}

export default new AuthController();
