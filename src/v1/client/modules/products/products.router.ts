import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  cookieSecurity,
  errorResponse,
  jsonContent,
  ProductSchema,
} from "src/lib/openapi.js";
import productsController from "./products.controller.js";
import {
  TGetProductByIdParam,
  TSearchProductsQuery,
} from "./dto/products.dto.js";

const productsRouter = new OpenAPIHono<TServerContext>();

productsRouter.use(AuthMiddleware);

const searchProductsRoute = createRoute({
  method: "get",
  path: "/search",
  tags: ["Products"],
  summary: "Search products",
  description:
    "Paginated search over products (`name`, `categoryId`, `isAvailable`, `page`, `limit`).",
  security: cookieSecurity,
  request: {
    query: TSearchProductsQuery,
  },
  responses: {
    200: jsonContent(z.array(ProductSchema), "The matching products"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
  },
});

const getProductByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Products"],
  summary: "Get product by id",
  security: cookieSecurity,
  request: {
    params: TGetProductByIdParam,
  },
  responses: {
    200: jsonContent(ProductSchema, "The product"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
    404: errorResponse("Product not found"),
  },
});

productsRouter.openapi(searchProductsRoute, (c) =>
  productsController.searchProducts(c),
);
productsRouter.openapi(getProductByIdRoute, (c) =>
  productsController.getProductById(c),
);

export default productsRouter;
