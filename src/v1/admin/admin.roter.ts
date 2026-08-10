import { OpenAPIHono } from "@hono/zod-openapi";
import { AdminAuthMiddleware } from "src/lib/auth/auth.middleware.js";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import cartRouter from "./modules/cart/cart.router.js";
import categoriesRouter from "./modules/categories/categories.router.js";
import ordersRouter from "./modules/orders/orders.router.js";
import productsRouter from "./modules/products/products.router.js";
import usersRouter from "./modules/users/users.router.js";

const adminRouter = new OpenAPIHono<TServerContext>();

adminRouter.use(AdminAuthMiddleware);

adminRouter.route("/cart", cartRouter);
adminRouter.route("/categories", categoriesRouter);
adminRouter.route("/orders", ordersRouter);
adminRouter.route("/products", productsRouter);
adminRouter.route("/users", usersRouter);

export default adminRouter;
