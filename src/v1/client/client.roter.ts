import { Hono } from "hono";
import accountRouter from "./modules/account/account.router.js";
import categoriesRouter from "./modules/categories/categories.router.js";

const clientRouter = new Hono();

clientRouter.route("/account", accountRouter);
clientRouter.route("/categories", categoriesRouter);

export default clientRouter;
