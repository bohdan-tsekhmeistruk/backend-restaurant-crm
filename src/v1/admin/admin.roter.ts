import { Hono } from "hono";
import { AdminAuthMiddleware } from "src/lib/auth/auth.middleware.js";
import categoriesRouter from "./modules/categories/categories.router.js";

const adminRouter = new Hono();

adminRouter.use(AdminAuthMiddleware);

adminRouter.route("/categories", categoriesRouter);

export default adminRouter;
