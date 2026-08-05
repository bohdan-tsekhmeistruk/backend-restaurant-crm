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

export const TCreateCategoryBody = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  parentId: z.uuid().optional(),
});

export type TCreateCategoryBody = z.infer<typeof TCreateCategoryBody>;

export type TCreateCategoryInput = {
  in: { json: TCreateCategoryBody };
  out: { json: TCreateCategoryBody };
};

export const TUpdateCategoryBody = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  parentId: z.uuid().nullable().optional(),
});

export type TUpdateCategoryBody = z.infer<typeof TUpdateCategoryBody>;

export type TUpdateCategoryInput = {
  in: {
    param: z.input<typeof TGetCategoryByIdParam>;
    json: TUpdateCategoryBody;
  };
  out: {
    param: z.output<typeof TGetCategoryByIdParam>;
    json: TUpdateCategoryBody;
  };
};

export type TDeleteCategoryInput = TGetCategoryByIdParam;

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
