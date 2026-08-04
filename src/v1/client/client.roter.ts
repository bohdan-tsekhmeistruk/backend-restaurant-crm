import { Hono } from "hono";
import accountRouter from "./modules/account/account.router.js";

const clientRouter = new Hono();

clientRouter.route("/account", accountRouter);

export default clientRouter;
