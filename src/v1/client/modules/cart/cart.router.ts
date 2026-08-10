import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  CartSchema,
  cookieSecurity,
  errorResponse,
  jsonContent,
} from "src/lib/openapi.js";
import cartController from "./cart.controller.js";
import {
  TAddCartItemBody,
  TCartItemIdParam,
  TUpdateCartItemBody,
} from "./dto/cart.dto.js";

const cartRouter = new OpenAPIHono<TServerContext>();

cartRouter.use(AuthMiddleware);

const getMyCartRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Cart"],
  summary: "Get cart",
  description: "Returns the current user's cart, creating it on first access.",
  security: cookieSecurity,
  responses: {
    200: jsonContent(CartSchema, "The current user's cart"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
  },
});

const addCartItemRoute = createRoute({
  method: "post",
  path: "/items",
  tags: ["Cart"],
  summary: "Add item",
  description:
    "Adds a product to the cart (quantity 1–99). Adding an existing product increments its quantity.",
  security: cookieSecurity,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: TAddCartItemBody } },
    },
  },
  responses: {
    201: jsonContent(CartSchema, "The updated cart"),
    400: errorResponse("Validation error or product is not available"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
    404: errorResponse("Product not found"),
  },
});

const updateCartItemRoute = createRoute({
  method: "patch",
  path: "/items/{id}",
  tags: ["Cart"],
  summary: "Update item quantity",
  security: cookieSecurity,
  request: {
    params: TCartItemIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: TUpdateCartItemBody } },
    },
  },
  responses: {
    200: jsonContent(CartSchema, "The updated cart"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
    404: errorResponse("Cart item not found"),
  },
});

const deleteCartItemRoute = createRoute({
  method: "delete",
  path: "/items/{id}",
  tags: ["Cart"],
  summary: "Remove item",
  security: cookieSecurity,
  request: {
    params: TCartItemIdParam,
  },
  responses: {
    200: jsonContent(CartSchema, "The updated cart"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
    404: errorResponse("Cart item not found"),
  },
});

cartRouter.openapi(getMyCartRoute, (c) => cartController.getMyCart(c));
cartRouter.openapi(addCartItemRoute, (c) => cartController.addCartItem(c));
cartRouter.openapi(updateCartItemRoute, (c) =>
  cartController.updateCartItem(c),
);
cartRouter.openapi(deleteCartItemRoute, (c) =>
  cartController.deleteCartItem(c),
);

export default cartRouter;
