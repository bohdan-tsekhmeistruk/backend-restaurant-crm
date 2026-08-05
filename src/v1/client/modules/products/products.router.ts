import { Hono } from "hono";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import productsController from "./products.controller.js";
import {
  TGetProductByIdParam,
  TSearchProductsQuery,
} from "./dto/products.dto.js";
import { sValidator } from "@hono/standard-validator";

const productsRouter = new Hono();

productsRouter.use(AuthMiddleware);

productsRouter.get(
  "/search",
  sValidator("query", TSearchProductsQuery),
  productsController.searchProducts,
);
productsRouter.get(
  "/:id",
  sValidator("param", TGetProductByIdParam),
  productsController.getProductById,
);

export default productsRouter;
