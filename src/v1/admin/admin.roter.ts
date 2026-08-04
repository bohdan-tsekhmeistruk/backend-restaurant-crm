import { Hono } from "hono";
import { AdminAuthMiddleware } from "src/lib/auth/auth.middleware.js";

const adminRouter = new Hono();

adminRouter.get("/", AdminAuthMiddleware, (c) =>
  c.json({ message: "Hello World" }),
);

export default adminRouter;
