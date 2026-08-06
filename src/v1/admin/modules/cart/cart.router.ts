import { Hono } from "hono";
import cartController from "./cart.controller.js";
import { sValidator } from "@hono/standard-validator";
import {
  TAddUserCartItemBody,
  TCartItemParams,
  TUpdateUserCartItemBody,
  TUserIdParam,
} from "./dto/cart.dto.js";

const cartRouter = new Hono();

cartRouter.get(
  "/:userId",
  sValidator("param", TUserIdParam),
  cartController.getUserCart,
);
cartRouter.post(
  "/:userId/items",
  sValidator("param", TUserIdParam),
  sValidator("json", TAddUserCartItemBody),
  cartController.addUserCartItem,
);
cartRouter.patch(
  "/:userId/items/:itemId",
  sValidator("param", TCartItemParams),
  sValidator("json", TUpdateUserCartItemBody),
  cartController.updateUserCartItem,
);
cartRouter.delete(
  "/:userId/items/:itemId",
  sValidator("param", TCartItemParams),
  cartController.deleteUserCartItem,
);

export default cartRouter;
