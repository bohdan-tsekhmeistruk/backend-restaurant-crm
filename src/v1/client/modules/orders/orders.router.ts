import { Hono } from "hono";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import ordersController from "./orders.controller.js";
import { sValidator } from "@hono/standard-validator";
import {
  TCancelOrderBody,
  TGetOrderByIdParam,
  TSearchOrdersQuery,
} from "./dto/orders.dto.js";

const ordersRouter = new Hono();

ordersRouter.use(AuthMiddleware);

ordersRouter.get(
  "/",
  sValidator("query", TSearchOrdersQuery),
  ordersController.getMyOrders,
);
ordersRouter.get(
  "/:id",
  sValidator("param", TGetOrderByIdParam),
  ordersController.getMyOrderById,
);
ordersRouter.post("/", ordersController.createMyOrder);
ordersRouter.patch(
  "/:id",
  sValidator("param", TGetOrderByIdParam),
  sValidator("json", TCancelOrderBody),
  ordersController.cancelMyOrder,
);

export default ordersRouter;
