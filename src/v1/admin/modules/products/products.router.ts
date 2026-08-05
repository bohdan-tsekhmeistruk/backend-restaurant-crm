import { Hono } from "hono";
import productsController from "./products.controller.js";
import { sValidator } from "@hono/standard-validator";
import {
  TCreateProductBody,
  TGetProductByIdParam,
  TSearchProductsQuery,
  TUpdateProductBody,
} from "./dto/products.dto.js";

const productsRouter = new Hono();

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
productsRouter.post(
  "/",
  sValidator("json", TCreateProductBody),
  productsController.createProduct,
);
productsRouter.patch(
  "/:id",
  sValidator("param", TGetProductByIdParam),
  sValidator("json", TUpdateProductBody),
  productsController.updateProduct,
);
productsRouter.delete(
  "/:id",
  sValidator("param", TGetProductByIdParam),
  productsController.deleteProduct,
);

export default productsRouter;
