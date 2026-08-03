import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import withPrisma, { type ContextWithPrisma } from "src/lib/prisma.js";
import "dotenv/config";
import v1Router from "src/v1/v1.router.js";

const app = new Hono<ContextWithPrisma>();

app.use(logger());

app.get("/", (c) => {
  return c.json({ message: "Api is ready!" });
});

app.use("/api/*", withPrisma);

app.route("/api/v1", v1Router);

serve(
  {
    fetch: app.fetch,
    port: parseInt(process.env.PORT || "3000"),
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
