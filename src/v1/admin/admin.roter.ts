import { Hono } from "hono";
import { AdminAuthMiddleware } from "src/lib/auth/auth.middleware.js";
import cartRouter from "./modules/cart/cart.router.js";
import categoriesRouter from "./modules/categories/categories.router.js";
import productsRouter from "./modules/products/products.router.js";

const adminRouter = new Hono();

adminRouter.use(AdminAuthMiddleware);

adminRouter.route("/cart", cartRouter);
adminRouter.route("/categories", categoriesRouter);
adminRouter.route("/products", productsRouter);

export default adminRouter;
