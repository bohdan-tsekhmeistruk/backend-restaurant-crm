import { z } from "@hono/zod-openapi";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

export const TLoginBody = z.object({
  email: z.email().openapi({ example: "user@example.com" }),
  password: z.string().min(8).max(32).openapi({ example: "Str0ng!Password" }),
});

export type TLoginBody = z.infer<typeof TLoginBody>;

export const TRegisterBody = z.object({
  email: z.email().openapi({ example: "user@example.com" }),
  password: passwordSchema,
  firstName: z.string().min(1).max(32).openapi({ example: "John" }),
  lastName: z.string().min(1).max(32).openapi({ example: "Doe" }),
  phone: z.string().min(1).max(32).openapi({ example: "+380501234567" }),
});

export type TRegisterBody = z.infer<typeof TRegisterBody>;

export type TLoginParams = {
  email: string;
  password: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

export type TRegisterParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

export type TRefreshTokenParams = {
  refreshToken: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
};
