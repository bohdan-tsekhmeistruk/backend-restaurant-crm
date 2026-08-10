import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  AdminCartSchema,
  cookieSecurity,
  errorResponse,
  jsonContent,
} from "src/lib/openapi.js";
import cartController from "./cart.controller.js";
import {
  TAddUserCartItemBody,
  TCartItemParams,
  TUpdateUserCartItemBody,
  TUserIdParam,
} from "./dto/cart.dto.js";

const cartRouter = new OpenAPIHono<TServerContext>();

const getUserCartRoute = createRoute({
  method: "get",
  path: "/{userId}",
  tags: ["Admin Cart"],
  summary: "Get a user's cart",
  description: "Returns the user's cart, creating it on first access.",
  security: cookieSecurity,
  request: {
    params: TUserIdParam,
  },
  responses: {
    200: jsonContent(AdminCartSchema, "The user's cart"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("User not found"),
  },
});

const addUserCartItemRoute = createRoute({
  method: "post",
  path: "/{userId}/items",
  tags: ["Admin Cart"],
  summary: "Add item to a user's cart",
  description:
    "Adds a product to the user's cart. Adding an existing product increments its quantity.",
  security: cookieSecurity,
  request: {
    params: TUserIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: TAddUserCartItemBody } },
    },
  },
  responses: {
    201: jsonContent(AdminCartSchema, "The updated cart"),
    400: errorResponse("Validation error or product is not available"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("User or product not found"),
  },
});

const updateUserCartItemRoute = createRoute({
  method: "patch",
  path: "/{userId}/items/{itemId}",
  tags: ["Admin Cart"],
  summary: "Update a cart item",
  description:
    "Updates the quantity and/or the product of an existing cart item.",
  security: cookieSecurity,
  request: {
    params: TCartItemParams,
    body: {
      required: true,
      content: { "application/json": { schema: TUpdateUserCartItemBody } },
    },
  },
  responses: {
    200: jsonContent(AdminCartSchema, "The updated cart"),
    400: errorResponse("Validation error or product is not available"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Cart item or product not found"),
  },
});

const deleteUserCartItemRoute = createRoute({
  method: "delete",
  path: "/{userId}/items/{itemId}",
  tags: ["Admin Cart"],
  summary: "Remove a cart item",
  security: cookieSecurity,
  request: {
    params: TCartItemParams,
  },
  responses: {
    200: jsonContent(AdminCartSchema, "The updated cart"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Cart item not found"),
  },
});

cartRouter.openapi(getUserCartRoute, (c) => cartController.getUserCart(c));
cartRouter.openapi(addUserCartItemRoute, (c) =>
  cartController.addUserCartItem(c),
);
cartRouter.openapi(updateUserCartItemRoute, (c) =>
  cartController.updateUserCartItem(c),
);
cartRouter.openapi(deleteUserCartItemRoute, (c) =>
  cartController.deleteUserCartItem(c),
);

export default cartRouter;
