import { Hono } from "hono";
import ordersController from "./orders.controller.js";
import { sValidator } from "@hono/standard-validator";
import {
  TCreateOrderBody,
  TGetOrderByIdParam,
  TSearchOrdersQuery,
  TUpdateOrderBody,
} from "./dto/orders.dto.js";

const ordersRouter = new Hono();

ordersRouter.get(
  "/search",
  sValidator("query", TSearchOrdersQuery),
  ordersController.searchOrders,
);
ordersRouter.get(
  "/:id",
  sValidator("param", TGetOrderByIdParam),
  ordersController.getOrderById,
);
ordersRouter.post(
  "/",
  sValidator("json", TCreateOrderBody),
  ordersController.createOrder,
);
ordersRouter.patch(
  "/:id",
  sValidator("param", TGetOrderByIdParam),
  sValidator("json", TUpdateOrderBody),
  ordersController.updateOrder,
);
ordersRouter.delete(
  "/:id",
  sValidator("param", TGetOrderByIdParam),
  ordersController.deleteOrder,
);

export default ordersRouter;
