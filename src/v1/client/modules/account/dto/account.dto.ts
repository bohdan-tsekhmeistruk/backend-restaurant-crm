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

export const TSendPasswordResetBody = z.object({
  email: z.string().email(),
});

export type TSendPasswordResetBody = z.infer<typeof TSendPasswordResetBody>;

export type TSendPasswordResetInput = {
  in: { json: TSendPasswordResetBody };
  out: { json: TSendPasswordResetBody };
};

export const TCheckPasswordResetBody = z.object({
  token: z.string().min(1).max(256),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
});

export type TCheckPasswordResetBody = z.infer<typeof TCheckPasswordResetBody>;

export type TCheckPasswordResetInput = {
  in: { json: TCheckPasswordResetBody };
  out: { json: TCheckPasswordResetBody };
};
