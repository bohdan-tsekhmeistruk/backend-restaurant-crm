import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { logger } from "hono/logger";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import { jsonContent, openAPIDefaultHook } from "src/lib/openapi.js";
import withPrisma from "src/lib/prisma.js";
import v1Router from "src/v1/v1.router.js";
import "dotenv/config";

const app = new OpenAPIHono<TServerContext>({
  defaultHook: openAPIDefaultHook,
});

app.use(logger());

const healthRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Health check",
  responses: {
    200: jsonContent(
      z.object({ message: z.string().openapi({ example: "Api is ready!" }) }),
      "API is ready",
    ),
  },
});

app.openapi(healthRoute, (c) => c.json({ message: "Api is ready!" }, 200));

app.openAPIRegistry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "accessToken",
  description: "JWT access token (signed httpOnly cookie, ~15 min lifetime)",
});

app.openAPIRegistry.registerComponent("securitySchemes", "refreshCookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "refreshToken",
  description: "Rotating refresh token (signed httpOnly cookie)",
});

app.use("/api/*", withPrisma);

app.route("/api/v1", v1Router);

app.doc("/doc", {
  openapi: "3.0.3",
  info: {
    title: "Restaurant CRM API",
    version: "0.8.1",
    description:
      "REST API backend for a restaurant CRM system. Authentication is cookie-based: " +
      "`accessToken` and `refreshToken` are delivered as signed httpOnly cookies. " +
      "Errors are returned as `{ \"message\": string }`.",
  },
});

app.get("/docs", swaggerUI({ url: "/doc" }));

export default app;
