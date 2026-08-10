import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  AdminProductSchema,
  cookieSecurity,
  errorResponse,
  jsonContent,
  noContent,
} from "src/lib/openapi.js";
import productsController from "./products.controller.js";
import {
  TCreateProductBody,
  TGetProductByIdParam,
  TSearchProductsQuery,
  TUpdateProductBody,
} from "./dto/products.dto.js";

const productsRouter = new OpenAPIHono<TServerContext>();

const searchProductsRoute = createRoute({
  method: "get",
  path: "/search",
  tags: ["Admin Products"],
  summary: "Search products",
  description:
    "Paginated search over products (`name`, `categoryId`, `isAvailable`, `page`, `limit`).",
  security: cookieSecurity,
  request: {
    query: TSearchProductsQuery,
  },
  responses: {
    200: jsonContent(z.array(AdminProductSchema), "The matching products"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
  },
});

const getProductByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Admin Products"],
  summary: "Get product by id",
  security: cookieSecurity,
  request: {
    params: TGetProductByIdParam,
  },
  responses: {
    200: jsonContent(AdminProductSchema, "The product"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Product not found"),
  },
});

const createProductRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Admin Products"],
  summary: "Create product",
  security: cookieSecurity,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: TCreateProductBody } },
    },
  },
  responses: {
    201: jsonContent(AdminProductSchema, "The created product"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Category not found"),
  },
});

const updateProductRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Admin Products"],
  summary: "Update product",
  security: cookieSecurity,
  request: {
    params: TGetProductByIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: TUpdateProductBody } },
    },
  },
  responses: {
    200: jsonContent(AdminProductSchema, "The updated product"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Product or category not found"),
  },
});

const deleteProductRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Admin Products"],
  summary: "Delete product",
  description:
    "Products referenced by cart or order items are protected from deletion.",
  security: cookieSecurity,
  request: {
    params: TGetProductByIdParam,
  },
  responses: {
    204: noContent("Product deleted"),
    400: errorResponse("Validation error or product is used in carts/orders"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Product not found"),
  },
});

productsRouter.openapi(searchProductsRoute, (c) =>
  productsController.searchProducts(c),
);
productsRouter.openapi(getProductByIdRoute, (c) =>
  productsController.getProductById(c),
);
productsRouter.openapi(createProductRoute, (c) =>
  productsController.createProduct(c),
);
productsRouter.openapi(updateProductRoute, (c) =>
  productsController.updateProduct(c),
);
productsRouter.openapi(deleteProductRoute, (c) =>
  productsController.deleteProduct(c),
);

export default productsRouter;
