import { z } from "zod";
import type { Prisma } from "src/generated/prisma/client.js";

export const TSearchProductsQuery = z.object({
  name: z.string().min(1).max(255).optional(),
  categoryId: z.uuid().optional(),
  isAvailable: z.stringbool().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TSearchProductsQuery = z.output<typeof TSearchProductsQuery>;

export type TSearchProductsInput = {
  in: { query: z.input<typeof TSearchProductsQuery> };
  out: { query: TSearchProductsQuery };
};

export const TGetProductByIdParam = z.object({
  id: z.uuid(),
});

export type TGetProductByIdParam = {
  in: { param: z.input<typeof TGetProductByIdParam> };
  out: { param: z.output<typeof TGetProductByIdParam> };
};

export const TCreateProductBody = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(2000),
  image: z.string().min(1).max(2048).optional(),
  price: z.number().positive(),
  isAvailable: z.boolean().optional(),
  categoryId: z.uuid(),
});

export type TCreateProductBody = z.infer<typeof TCreateProductBody>;

export type TCreateProductInput = {
  in: { json: TCreateProductBody };
  out: { json: TCreateProductBody };
};

export const TUpdateProductBody = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(2000).optional(),
  image: z.string().min(1).max(2048).nullable().optional(),
  price: z.number().positive().optional(),
  isAvailable: z.boolean().optional(),
  categoryId: z.uuid().optional(),
});

export type TUpdateProductBody = z.infer<typeof TUpdateProductBody>;

export type TUpdateProductInput = {
  in: {
    param: z.input<typeof TGetProductByIdParam>;
    json: TUpdateProductBody;
  };
  out: {
    param: z.output<typeof TGetProductByIdParam>;
    json: TUpdateProductBody;
  };
};

export type TDeleteProductInput = TGetProductByIdParam;

export const ProductSelect = {
  id: true,
  categoryId: true,
  name: true,
  description: true,
  image: true,
  price: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      parent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const satisfies Prisma.ProductSelect;

export type TProductResponse = Prisma.ProductGetPayload<{
  select: typeof ProductSelect;
}>;
