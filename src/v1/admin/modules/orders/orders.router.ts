import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  AdminOrderSchema,
  cookieSecurity,
  errorResponse,
  jsonContent,
  noContent,
} from "src/lib/openapi.js";
import ordersController from "./orders.controller.js";
import {
  TCreateOrderBody,
  TGetOrderByIdParam,
  TSearchOrdersQuery,
  TUpdateOrderBody,
} from "./dto/orders.dto.js";

const ordersRouter = new OpenAPIHono<TServerContext>();

const searchOrdersRoute = createRoute({
  method: "get",
  path: "/search",
  tags: ["Admin Orders"],
  summary: "Search orders",
  description:
    "Paginated search over all orders (`userId`, `status`, `page`, `limit`).",
  security: cookieSecurity,
  request: {
    query: TSearchOrdersQuery,
  },
  responses: {
    200: jsonContent(z.array(AdminOrderSchema), "The matching orders"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
  },
});

const getOrderByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Admin Orders"],
  summary: "Get order by id",
  security: cookieSecurity,
  request: {
    params: TGetOrderByIdParam,
  },
  responses: {
    200: jsonContent(AdminOrderSchema, "The order"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Order not found"),
  },
});

const createOrderRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Admin Orders"],
  summary: "Create order for a user",
  description:
    "Creates a PENDING order with an explicit `userId` and `items[]` (bypasses the cart). All products must be available.",
  security: cookieSecurity,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: TCreateOrderBody } },
    },
  },
  responses: {
    201: jsonContent(AdminOrderSchema, "The created order"),
    400: errorResponse("Validation error or a product is not available"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("User or products not found"),
  },
});

const updateOrderRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Admin Orders"],
  summary: "Update order status",
  description: "Sets any `OrderStatus` — no transition validation.",
  security: cookieSecurity,
  request: {
    params: TGetOrderByIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: TUpdateOrderBody } },
    },
  },
  responses: {
    200: jsonContent(AdminOrderSchema, "The updated order"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Order not found"),
  },
});

const deleteOrderRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Admin Orders"],
  summary: "Delete order",
  description: "Hard-deletes the order and all of its items.",
  security: cookieSecurity,
  request: {
    params: TGetOrderByIdParam,
  },
  responses: {
    204: noContent("Order deleted"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Order not found"),
  },
});

ordersRouter.openapi(searchOrdersRoute, (c) =>
  ordersController.searchOrders(c),
);
ordersRouter.openapi(getOrderByIdRoute, (c) =>
  ordersController.getOrderById(c),
);
ordersRouter.openapi(createOrderRoute, (c) => ordersController.createOrder(c));
ordersRouter.openapi(updateOrderRoute, (c) => ordersController.updateOrder(c));
ordersRouter.openapi(deleteOrderRoute, (c) => ordersController.deleteOrder(c));

export default ordersRouter;
