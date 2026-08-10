import { randomUUID } from "node:crypto";
import type { PrismaClient } from "src/generated/prisma/client.js";

/**
 * A stateful in-memory implementation of the PrismaClient surface used by the
 * application. It exists to drive HTTP-level e2e tests without a database:
 * rows are stored in Maps, `where` filters support the exact operators the
 * services use (equals, in, contains+mode, gt, nested relation filters) and
 * `select`/`omit` projections are applied so response shapes stay realistic.
 */

type Row = Record<string, any>;

function pick(row: Row, select: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(select)) {
    if (value === true) {
      out[key] = row[key];
    } else if (key === "_count") {
      out[key] = row._count;
    } else if (value && typeof value === "object" && "select" in value) {
      const rel = row[key];
      out[key] = Array.isArray(rel)
        ? rel.map((r) => pick(r, value.select))
        : rel == null
          ? null
          : pick(rel, value.select);
    }
  }
  return out;
}

function project(row: Row | null, args: { select?: Row; omit?: Row }): Row | null {
  if (!row) return null;
  if (args.select) return pick(row, args.select);
  if (args.omit) {
    const out = { ...row };
    for (const key of Object.keys(args.omit)) delete out[key];
    return out;
  }
  return { ...row };
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "OR" && Array.isArray(cond)) {
      return cond.some((sub) => matches(row, sub));
    }
    const value = row[key];
    if (cond && typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond)) {
      if ("in" in cond) return cond.in.includes(value);
      if ("contains" in cond) {
        if (typeof value !== "string") return false;
        return cond.mode === "insensitive"
          ? value.toLowerCase().includes(cond.contains.toLowerCase())
          : value.includes(cond.contains);
      }
      if ("gt" in cond) return value > cond.gt;
      return matches(value ?? {}, cond);
    }
    return value === cond;
  });
}

function sortRows(rows: Row[], orderBy?: Row): Row[] {
  if (!orderBy) return rows;
  const [field, dir] = Object.entries(orderBy)[0]!;
  return [...rows].sort((a, b) => {
    const diff = a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0;
    return dir === "desc" ? -diff : diff;
  });
}

function page(rows: Row[], args: { take?: number; skip?: number }): Row[] {
  const sliced = args.skip ? rows.slice(args.skip) : rows;
  return args.take !== undefined ? sliced.slice(0, args.take) : sliced;
}

export interface InMemoryStore {
  users: Map<string, Row>;
  sessions: Map<string, Row>;
  categories: Map<string, Row>;
  products: Map<string, Row>;
  carts: Map<string, Row>;
  cartItems: Map<string, Row>;
  orders: Map<string, Row>;
  orderItems: Map<string, Row>;
  passwordResets: Map<string, Row>;
  emailVerifications: Map<string, Row>;
}

export function createInMemoryPrisma() {
  const store: InMemoryStore = {
    users: new Map(),
    sessions: new Map(),
    categories: new Map(),
    products: new Map(),
    carts: new Map(),
    cartItems: new Map(),
    orders: new Map(),
    orderItems: new Map(),
    passwordResets: new Map(),
    emailVerifications: new Map(),
  };

  const now = () => new Date();

  const touch = (row: Row) => {
    row.updatedAt = now();
    return row;
  };

  const hydrateCategory = (category: Row | null | undefined): Row | null => {
    if (!category) return null;
    const parent = category.parentId
      ? store.categories.get(category.parentId)
      : null;
    return {
      ...category,
      parent: parent ? { ...parent } : null,
      children: [...store.categories.values()].filter(
        (c) => c.parentId === category.id,
      ),
      _count: {
        products: [...store.products.values()].filter(
          (p) => p.categoryId === category.id,
        ).length,
      },
    };
  };

  const hydrateProduct = (product: Row | null | undefined): Row | null => {
    if (!product) return null;
    const category = product.categoryId
      ? store.categories.get(product.categoryId)
      : null;
    return {
      ...product,
      category: hydrateCategory(category),
      _count: {
        cartItems: [...store.cartItems.values()].filter(
          (i) => i.productId === product.id,
        ).length,
        orderItems: [...store.orderItems.values()].filter(
          (i) => i.productId === product.id,
        ).length,
      },
    };
  };

  const hydrateCart = (cart: Row | null | undefined): Row | null => {
    if (!cart) return null;
    const items = sortRows(
      [...store.cartItems.values()].filter((i) => i.cartId === cart.id),
      { createdAt: "asc" },
    ).map((item) => ({
      ...item,
      product: store.products.get(item.productId) ?? null,
    }));
    return { ...cart, items };
  };

  const hydrateOrder = (order: Row | null | undefined): Row | null => {
    if (!order) return null;
    const items = sortRows(
      [...store.orderItems.values()].filter((i) => i.orderId === order.id),
      { createdAt: "asc" },
    ).map((item) => ({
      ...item,
      product: store.products.get(item.productId) ?? null,
    }));
    return { ...order, items };
  };

  const findIn = (map: Map<string, Row>, where: Row): Row | null =>
    [...map.values()].find((row) => matches(row, where)) ?? null;

  const client = {
    user: {
      findUnique: async (args: any) =>
        project(findIn(store.users, args.where), args),
      findFirst: async (args: any) =>
        project(findIn(store.users, args.where), args),
      findMany: async (args: any = {}) => {
        const rows = page(
          sortRows(
            [...store.users.values()].filter((r) =>
              args.where ? matches(r, args.where) : true,
            ),
            args.orderBy,
          ),
          args,
        );
        return rows.map((r) => project(r, args));
      },
      create: async (args: any) => {
        const { cart, ...data } = args.data;
        const user: Row = {
          id: randomUUID(),
          role: "USER",
          status: "ACTIVE",
          isVerified: false,
          ...data,
          createdAt: now(),
          updatedAt: now(),
        };
        store.users.set(user.id, user);
        if (cart?.create !== undefined) {
          const cartRow: Row = {
            id: randomUUID(),
            userId: user.id,
            createdAt: now(),
            updatedAt: now(),
          };
          store.carts.set(cartRow.id, cartRow);
        }
        return project(user, args);
      },
      update: async (args: any) => {
        const row = findIn(store.users, args.where);
        if (!row) throw new Error("User not found");
        Object.assign(row, args.data);
        touch(row);
        return project(row, args);
      },
    },

    session: {
      findUnique: async (args: any) =>
        project(findIn(store.sessions, args.where), args),
      findFirst: async (args: any) =>
        project(findIn(store.sessions, args.where), args),
      create: async (args: any) => {
        const row: Row = {
          id: randomUUID(),
          ipAddress: null,
          userAgent: null,
          ...args.data,
          createdAt: now(),
          updatedAt: now(),
        };
        store.sessions.set(row.id, row);
        return project(row, args);
      },
      update: async (args: any) => {
        const row = findIn(store.sessions, args.where);
        if (!row) throw new Error("Session not found");
        Object.assign(row, args.data);
        touch(row);
        return project(row, args);
      },
      deleteMany: async (args: any) => {
        const doomed = [...store.sessions.values()].filter((r) =>
          matches(r, args.where),
        );
        for (const row of doomed) store.sessions.delete(row.id);
        return { count: doomed.length };
      },
    },

    productCategory: {
      findUnique: async (args: any) =>
        project(hydrateCategory(findIn(store.categories, args.where)), args),
      findMany: async (args: any = {}) => {
        const rows = page(
          [...store.categories.values()]
            .filter((r) => (args.where ? matches(r, args.where) : true))
            .map((r) => hydrateCategory(r)!),
          args,
        );
        return rows.map((r) => project(r, args));
      },
      create: async (args: any) => {
        const row: Row = {
          id: randomUUID(),
          parentId: null,
          description: null,
          ...args.data,
          createdAt: now(),
          updatedAt: now(),
        };
        store.categories.set(row.id, row);
        return project(hydrateCategory(row), args);
      },
      update: async (args: any) => {
        const row = findIn(store.categories, args.where);
        if (!row) throw new Error("Category not found");
        Object.assign(row, args.data);
        touch(row);
        return project(hydrateCategory(row), args);
      },
      delete: async (args: any) => {
        const row = findIn(store.categories, args.where);
        if (!row) throw new Error("Category not found");
        store.categories.delete(row.id);
        return row;
      },
    },

    product: {
      findUnique: async (args: any) =>
        project(hydrateProduct(findIn(store.products, args.where)), args),
      findMany: async (args: any = {}) => {
        const rows = page(
          [...store.products.values()]
            .filter((r) => (args.where ? matches(r, args.where) : true))
            .map((r) => hydrateProduct(r)!),
          args,
        );
        return rows.map((r) => project(r, args));
      },
      create: async (args: any) => {
        const row: Row = {
          id: randomUUID(),
          image: null,
          isAvailable: true,
          ...args.data,
          createdAt: now(),
          updatedAt: now(),
        };
        store.products.set(row.id, row);
        return project(hydrateProduct(row), args);
      },
      update: async (args: any) => {
        const row = findIn(store.products, args.where);
        if (!row) throw new Error("Product not found");
        Object.assign(row, args.data);
        touch(row);
        return project(hydrateProduct(row), args);
      },
      delete: async (args: any) => {
        const row = findIn(store.products, args.where);
        if (!row) throw new Error("Product not found");
        store.products.delete(row.id);
        return row;
      },
    },

    cart: {
      upsert: async (args: any) => {
        let row = findIn(store.carts, args.where);
        if (!row) {
          row = {
            id: randomUUID(),
            ...args.create,
            createdAt: now(),
            updatedAt: now(),
          };
          store.carts.set(row.id, row);
        }
        return project(hydrateCart(row), args);
      },
      findUnique: async (args: any) =>
        project(hydrateCart(findIn(store.carts, args.where)), args),
    },

    cartItem: {
      findFirst: async (args: any) => {
        const rows = [...store.cartItems.values()].map((i) => ({
          ...i,
          cart: store.carts.get(i.cartId) ?? null,
        }));
        return project(rows.find((r) => matches(r, args.where)) ?? null, args);
      },
      create: async (args: any) => {
        const row: Row = {
          id: randomUUID(),
          quantity: 1,
          ...args.data,
          createdAt: now(),
          updatedAt: now(),
        };
        store.cartItems.set(row.id, row);
        return project(row, args);
      },
      update: async (args: any) => {
        const row = findIn(store.cartItems, args.where);
        if (!row) throw new Error("Cart item not found");
        Object.assign(row, args.data);
        touch(row);
        return project(row, args);
      },
      delete: async (args: any) => {
        const row = findIn(store.cartItems, args.where);
        if (!row) throw new Error("Cart item not found");
        store.cartItems.delete(row.id);
        return row;
      },
      deleteMany: async (args: any) => {
        const doomed = [...store.cartItems.values()].filter((r) =>
          matches(r, args.where),
        );
        for (const row of doomed) store.cartItems.delete(row.id);
        return { count: doomed.length };
      },
    },

    order: {
      findUnique: async (args: any) =>
        project(hydrateOrder(findIn(store.orders, args.where)), args),
      findFirst: async (args: any) =>
        project(hydrateOrder(findIn(store.orders, args.where)), args),
      findMany: async (args: any = {}) => {
        const rows = page(
          sortRows(
            [...store.orders.values()]
              .filter((r) => (args.where ? matches(r, args.where) : true))
              .map((r) => hydrateOrder(r)!),
            args.orderBy,
          ),
          args,
        );
        return rows.map((r) => project(r, args));
      },
      create: async (args: any) => {
        const { items, ...data } = args.data;
        const order: Row = {
          id: randomUUID(),
          status: "PENDING",
          ...data,
          createdAt: now(),
          updatedAt: now(),
        };
        store.orders.set(order.id, order);
        for (const item of items?.create ?? []) {
          const itemRow: Row = {
            id: randomUUID(),
            orderId: order.id,
            quantity: 1,
            ...item,
            createdAt: now(),
            updatedAt: now(),
          };
          store.orderItems.set(itemRow.id, itemRow);
        }
        return project(hydrateOrder(order), args);
      },
      update: async (args: any) => {
        const row = findIn(store.orders, args.where);
        if (!row) throw new Error("Order not found");
        Object.assign(row, args.data);
        touch(row);
        return project(hydrateOrder(row), args);
      },
      delete: async (args: any) => {
        const row = findIn(store.orders, args.where);
        if (!row) throw new Error("Order not found");
        store.orders.delete(row.id);
        return row;
      },
    },

    orderItem: {
      deleteMany: async (args: any) => {
        const doomed = [...store.orderItems.values()].filter((r) =>
          matches(r, args.where),
        );
        for (const row of doomed) store.orderItems.delete(row.id);
        return { count: doomed.length };
      },
    },

    passwordReset: {
      findFirst: async (args: any = {}) => {
        const rows = sortRows(
          [...store.passwordResets.values()].filter((r) =>
            args.where ? matches(r, args.where) : true,
          ),
          args.orderBy,
        );
        return project(rows[0] ?? null, args);
      },
      create: async (args: any) => {
        const row: Row = {
          id: randomUUID(),
          ipAddress: null,
          userAgent: null,
          changedAt: null,
          ...args.data,
          createdAt: now(),
          updatedAt: now(),
        };
        store.passwordResets.set(row.id, row);
        return project(row, args);
      },
      update: async (args: any) => {
        const row = findIn(store.passwordResets, args.where);
        if (!row) throw new Error("PasswordReset not found");
        Object.assign(row, args.data);
        touch(row);
        return project(row, args);
      },
    },

    emailVerification: {
      findFirst: async (args: any = {}) => {
        const rows = sortRows(
          [...store.emailVerifications.values()].filter((r) =>
            args.where ? matches(r, args.where) : true,
          ),
          args.orderBy,
        );
        return project(rows[0] ?? null, args);
      },
      create: async (args: any) => {
        const row: Row = {
          id: randomUUID(),
          ipAddress: null,
          userAgent: null,
          verifiedAt: null,
          ...args.data,
          createdAt: now(),
          updatedAt: now(),
        };
        store.emailVerifications.set(row.id, row);
        return project(row, args);
      },
      update: async (args: any) => {
        const row = findIn(store.emailVerifications, args.where);
        if (!row) throw new Error("EmailVerification not found");
        Object.assign(row, args.data);
        touch(row);
        return project(row, args);
      },
    },

    $transaction: async (callback: any) => {
      if (typeof callback === "function") return callback(client);
      return Promise.all(callback);
    },
  };

  return { store, prisma: client as unknown as PrismaClient };
}

export type InMemoryPrisma = ReturnType<typeof createInMemoryPrisma>;
