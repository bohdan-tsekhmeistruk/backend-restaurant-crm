import { Hono } from "hono";
import accountRouter from "./modules/account/account.router.js";
import cartRouter from "./modules/cart/cart.router.js";
import categoriesRouter from "./modules/categories/categories.router.js";
import productsRouter from "./modules/products/products.router.js";

const clientRouter = new Hono();

clientRouter.route("/account", accountRouter);
clientRouter.route("/cart", cartRouter);
clientRouter.route("/categories", categoriesRouter);
clientRouter.route("/products", productsRouter);

export default clientRouter;
