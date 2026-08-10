import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  cookieSecurity,
  errorResponse,
  jsonContent,
  OrderSchema,
} from "src/lib/openapi.js";
import ordersController from "./orders.controller.js";
import {
  TCancelOrderBody,
  TGetOrderByIdParam,
  TSearchOrdersQuery,
} from "./dto/orders.dto.js";

const ordersRouter = new OpenAPIHono<TServerContext>();

ordersRouter.use(AuthMiddleware);

const getMyOrdersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Orders"],
  summary: "List own orders",
  description: "Paginated list of the current user's orders (`status`, `page`, `limit`).",
  security: cookieSecurity,
  request: {
    query: TSearchOrdersQuery,
  },
  responses: {
    200: jsonContent(z.array(OrderSchema), "The current user's orders"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
  },
});

const getMyOrderByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Orders"],
  summary: "Get own order by id",
  security: cookieSecurity,
  request: {
    params: TGetOrderByIdParam,
  },
  responses: {
    200: jsonContent(OrderSchema, "The order"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
    404: errorResponse("Order not found"),
  },
});

const createMyOrderRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Orders"],
  summary: "Checkout",
  description:
    "Creates a PENDING order from the current user's cart and clears the cart. All products must be available.",
  security: cookieSecurity,
  responses: {
    201: jsonContent(OrderSchema, "The created order"),
    400: errorResponse("Cart is empty or a product is not available"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
  },
});

const cancelMyOrderRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Orders"],
  summary: "Cancel order",
  description: "Cancels an own order (`PENDING` → `CANCELLED` only).",
  security: cookieSecurity,
  request: {
    params: TGetOrderByIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: TCancelOrderBody } },
    },
  },
  responses: {
    200: jsonContent(OrderSchema, "The cancelled order"),
    400: errorResponse("Validation error or only pending orders can be cancelled"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
    404: errorResponse("Order not found"),
  },
});

ordersRouter.openapi(getMyOrdersRoute, (c) => ordersController.getMyOrders(c));
ordersRouter.openapi(getMyOrderByIdRoute, (c) =>
  ordersController.getMyOrderById(c),
);
ordersRouter.openapi(createMyOrderRoute, (c) =>
  ordersController.createMyOrder(c),
);
ordersRouter.openapi(cancelMyOrderRoute, (c) =>
  ordersController.cancelMyOrder(c),
);

export default ordersRouter;
