import { z } from "zod";

export const TUpdateAccountBody = z.object({
  firstName: z.string().min(1).max(32).optional(),
  lastName: z.string().min(1).max(32).optional(),
  phone: z.string().min(1).max(32).optional(),
});

export type TUpdateAccountBody = z.infer<typeof TUpdateAccountBody>;

export type TUpdateAccountInput = {
  in: { json: TUpdateAccountBody };
  out: { json: TUpdateAccountBody };
};

export const TCheckEmailVerificationBody = z.object({
  token: z.string().min(1).max(255),
});

export type TCheckEmailVerificationBody = z.infer<
  typeof TCheckEmailVerificationBody
>;

export type TCheckEmailVerificationInput = {
  in: { json: TCheckEmailVerificationBody };
  out: { json: TCheckEmailVerificationBody };
};
