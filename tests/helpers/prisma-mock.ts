import { vi } from "vitest";
import type { PrismaClient } from "src/generated/prisma/client.js";

/**
 * Creates a fully mocked PrismaClient for unit tests.
 * `$transaction` invokes the callback with the same mock so transactional
 * code paths can be asserted without a database.
 */
export function createPrismaMock() {
  const mock = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    productCategory: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    cartItem: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    emailVerification: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    passwordReset: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  mock.$transaction.mockImplementation(async (callback: any) => {
    if (typeof callback === "function") {
      return callback(mock);
    }
    return Promise.all(callback);
  });

  return mock;
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;

/** Convenience cast so the mock can be passed where PrismaClient is expected. */
export function asPrisma(mock: PrismaMock): PrismaClient {
  return mock as unknown as PrismaClient;
}
