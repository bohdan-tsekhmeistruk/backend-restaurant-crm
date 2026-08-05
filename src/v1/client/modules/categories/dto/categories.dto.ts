import { z } from "zod";
import type { Prisma } from "src/generated/prisma/client.js";

export const TSearchCategoriesQuery = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TSearchCategoriesQuery = z.output<typeof TSearchCategoriesQuery>;

export type TSearchCategoriesInput = {
  in: { query: z.input<typeof TSearchCategoriesQuery> };
  out: { query: TSearchCategoriesQuery };
};

export const TGetCategoryByIdParam = z.object({
  id: z.uuid(),
});

export type TGetCategoryByIdParam = {
  in: { param: z.input<typeof TGetCategoryByIdParam> };
  out: { param: z.output<typeof TGetCategoryByIdParam> };
};

export const CategorySelect = {
  id: true,
  name: true,
  description: true,
  parent: {
    select: {
      id: true,
      name: true,
    },
  },
  children: {
    select: {
      id: true,
      name: true,
    },
  },
} as const satisfies Prisma.ProductCategorySelect;

export type TCategoryResponse = Prisma.ProductCategoryGetPayload<{
  select: typeof CategorySelect;
}>;
