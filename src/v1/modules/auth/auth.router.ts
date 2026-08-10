import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  AuthResponseSchema,
  errorResponse,
  jsonContent,
  noContent,
  refreshCookieSecurity,
} from "src/lib/openapi.js";
import authController from "./auth.controller.js";
import { TLoginBody, TRegisterBody } from "./dto/auth.dto.js";

const authRouter = new OpenAPIHono<TServerContext>();

const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  summary: "Log in",
  description:
    "Authenticates the user and sets signed httpOnly `accessToken` / `refreshToken` cookies. Reuses the session of the same device (User-Agent).",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: TLoginBody } },
    },
  },
  responses: {
    200: jsonContent(AuthResponseSchema, "Logged in successfully"),
    400: errorResponse("Validation error"),
    401: errorResponse("Invalid credentials"),
    403: errorResponse("Account is not active"),
    429: errorResponse("Rate limit exceeded"),
  },
});

const registerRoute = createRoute({
  method: "post",
  path: "/register",
  tags: ["Auth"],
  summary: "Register",
  description:
    "Creates a USER account, starts a session (tokens are set as signed httpOnly cookies) and creates an empty cart.",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: TRegisterBody } },
    },
  },
  responses: {
    201: jsonContent(AuthResponseSchema, "Registered successfully"),
    400: errorResponse("Validation error or user already exists"),
    429: errorResponse("Rate limit exceeded"),
  },
});

const refreshTokenRoute = createRoute({
  method: "post",
  path: "/refresh-token",
  tags: ["Auth"],
  summary: "Rotate tokens",
  description:
    "Exchanges the `refreshToken` cookie for a new access/refresh token pair and rotates the session.",
  security: refreshCookieSecurity,
  responses: {
    204: noContent("Tokens rotated and set as cookies"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
    429: errorResponse("Rate limit exceeded"),
  },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  summary: "Log out",
  description:
    "Deletes the session bound to the `refreshToken` cookie and clears the auth cookies.",
  security: refreshCookieSecurity,
  responses: {
    204: noContent("Logged out"),
    429: errorResponse("Rate limit exceeded"),
  },
});

authRouter.openapi(loginRoute, (c) => authController.login(c));
authRouter.openapi(registerRoute, (c) => authController.register(c));
authRouter.openapi(refreshTokenRoute, (c) => authController.refreshToken(c));
authRouter.openapi(logoutRoute, (c) => authController.logout(c));

export default authRouter;
