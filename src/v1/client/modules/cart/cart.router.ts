import { Hono } from "hono";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import cartController from "./cart.controller.js";
import { sValidator } from "@hono/standard-validator";
import {
  TAddCartItemBody,
  TCartItemIdParam,
  TUpdateCartItemBody,
} from "./dto/cart.dto.js";

const cartRouter = new Hono();

cartRouter.use(AuthMiddleware);

cartRouter.get("/", cartController.getMyCart);
cartRouter.post(
  "/items",
  sValidator("json", TAddCartItemBody),
  cartController.addCartItem,
);
cartRouter.patch(
  "/items/:id",
  sValidator("param", TCartItemIdParam),
  sValidator("json", TUpdateCartItemBody),
  cartController.updateCartItem,
);
cartRouter.delete(
  "/items/:id",
  sValidator("param", TCartItemIdParam),
  cartController.deleteCartItem,
);

export default cartRouter;
