import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono } from "hono";
import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import AuthMiddleware from "src/lib/auth/auth.middleware.js";
import type { ContextWithPrisma } from "src/lib/prisma.js";
import authRouter from "src/v1/modules/auth/auth.router.js";

const v1Router = new Hono();

v1Router.get("/", AuthMiddleware, (c) => c.json({ message: "Hello World" }));

// Apply rate limiting middleware
v1Router.use(
  rateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 30, // Limit each client to 30 requests per window
    keyGenerator: (c: Context<ContextWithPrisma, any, {}>) => {
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
    message: (c) => ({
      message: "Rate limit exceeded",
    }),
  }),
);

v1Router.route("/auth", authRouter);

export default v1Router;
