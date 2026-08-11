import { getConnInfo } from "@hono/node-server/conninfo";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import authRouter from "src/v1/modules/auth/auth.router.js";
import clientRouter from "./client/client.roter.js";
import adminRouter from "./admin/admin.roter.js";

const v1Router = new OpenAPIHono<TServerContext>();

v1Router.route("/", clientRouter);
v1Router.route("/admin", adminRouter);

// Apply rate limiting middleware
v1Router.use(
  "/auth/*",
  rateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 30, // Limit each client to 30 requests per window
    keyGenerator: (c: Context<TServerContext, any>) => {
      const connInfo = getConnInfo(c);
      const ipAddress = connInfo.remote.address;
      const userAgent = c.req.header("user-agent") ?? undefined;
      const user = c.get("user");

      if (user) {
        return Promise.resolve(user.id);
      } else if (userAgent) {
        return Promise.resolve(userAgent);
      }
      return Promise.resolve(ipAddress ?? "");
    },
    message: (_c) => ({
      message: "Rate limit exceeded",
    }),
  }),
);

v1Router.route("/auth", authRouter);

export default v1Router;
