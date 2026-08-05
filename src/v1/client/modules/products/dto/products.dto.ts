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

export const ProductSelect = {
  id: true,
  name: true,
  description: true,
  image: true,
  price: true,
  isAvailable: true,
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
