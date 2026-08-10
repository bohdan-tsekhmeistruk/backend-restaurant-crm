import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";

const h = vi.hoisted(() => ({
  fake: undefined as
    | ReturnType<typeof import("../helpers/in-memory-prisma.js").createInMemoryPrisma>
    | undefined,
  sendEmailWithTemplate: vi.fn(),
}));

// There is no real socket under app.request(), so the conninfo helper would throw
vi.mock("@hono/node-server/conninfo", () => ({
  getConnInfo: () => ({
    remote: { address: "127.0.0.1", port: 4321, addressType: "IPv4" },
  }),
}));

// Inject the in-memory Prisma instead of the real PostgreSQL-backed client
vi.mock("src/lib/prisma.js", () => ({
  default: (c: any, next: any) => {
    if (!c.get("prisma")) c.set("prisma", h.fake!.prisma);
    return next();
  },
}));

// Never send real emails — the tokens are read from the in-memory store
vi.mock("src/v1/modules/email/email.servie.js", () => ({
  default: { sendEmailWithTemplate: h.sendEmailWithTemplate },
}));

import app from "src/app.js";
import { createInMemoryPrisma } from "../helpers/in-memory-prisma.js";
import { extractCookies, mergeCookies, TEST_UUID } from "../helpers/http.js";

const USER = {
  email: "user@example.com",
  password: "Str0ng!Password",
  firstName: "John",
  lastName: "Doe",
  phone: "+380501234567",
};

const ADMIN = {
  email: "admin@example.com",
  password: "Adm1n!SecurePass",
};

const NEW_PASSWORD = "N3w!Password456";

function call(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  opts: { body?: unknown; cookies?: string } = {},
) {
  return app.request(path, {
    method,
    headers: {
      "user-agent": "vitest-e2e",
      ...(opts.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(opts.cookies ? { Cookie: opts.cookies } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

describe("e2e: full API lifecycle", () => {
  let userCookies = "";
  let adminCookies = "";
  let userId = "";
  let categoryId = "";
  let childCategoryId = "";
  let productId = "";
  let cartItemId = "";
  let orderId = "";
  let adminOrderId = "";

  beforeAll(async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    h.fake = createInMemoryPrisma();
    h.sendEmailWithTemplate.mockResolvedValue({
      messageId: "msg-1",
      rejected: [],
    });

    // Seed an admin account (registration always creates USER accounts)
    h.fake.store.users.set(TEST_UUID.admin, {
      id: TEST_UUID.admin,
      email: ADMIN.email,
      password: await bcrypt.hash(ADMIN.password, 4),
      firstName: "Admin",
      lastName: "Root",
      phone: "+10000000000",
      role: "ADMIN",
      status: "ACTIVE",
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------ health

  it("answers the health check", async () => {
    const res = await call("GET", "/");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ message: "Api is ready!" });
  });

  it("serves the generated OpenAPI document and Swagger UI", async () => {
    const doc = await call("GET", "/doc");
    expect(doc.status).toBe(200);
    const spec = await doc.json();
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.paths).toHaveProperty(["/api/v1/auth/register"]);

    const ui = await call("GET", "/docs");
    expect(ui.status).toBe(200);
    expect(ui.headers.get("content-type")).toContain("text/html");
  });

  // -------------------------------------------------------------------- auth

  it("rejects a weak registration password with a 400 validation error", async () => {
    const res = await call("POST", "/api/v1/auth/register", {
      body: { ...USER, password: "weak" },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(Array.isArray(body.message)).toBe(true);
  });

  it("registers a user, returns tokens and sets signed cookies", async () => {
    const res = await call("POST", "/api/v1/auth/register", { body: USER });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user).toMatchObject({
      email: USER.email,
      role: "USER",
      status: "ACTIVE",
      isVerified: false,
    });
    expect(body.user).not.toHaveProperty("password");
    expect(typeof body.accessToken).toBe("string");
    expect(typeof body.refreshToken).toBe("string");

    userCookies = extractCookies(res);
    expect(userCookies).toContain("accessToken=");
    expect(userCookies).toContain("refreshToken=");

    userId = body.user.id;
  });

  it("rejects a duplicate registration", async () => {
    const res = await call("POST", "/api/v1/auth/register", { body: USER });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: "User already exists",
    });
  });

  it("rejects malformed JSON bodies on public routes (400)", async () => {
    const res = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "vitest-e2e",
      },
      body: '{"email":',
    });
    expect(res.status).toBe(400);
  });

  it("rejects /account/me without cookies (401)", async () => {
    const res = await call("GET", "/api/v1/account/me");
    expect(res.status).toBe(401);
  });

  it("returns the profile for a valid access cookie", async () => {
    const res = await call("GET", "/api/v1/account/me", {
      cookies: userCookies,
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      id: userId,
      email: USER.email,
    });
  });

  it("rejects a login with a wrong password", async () => {
    const res = await call("POST", "/api/v1/auth/login", {
      body: { email: USER.email, password: "Wr0ng!Password" },
    });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      message: "Invalid credentials",
    });
  });

  it("logs in with the right password", async () => {
    const res = await call("POST", "/api/v1/auth/login", {
      body: { email: USER.email, password: USER.password },
    });

    expect(res.status).toBe(200);
    userCookies = mergeCookies(userCookies, res);
  });

  it("logs the admin in", async () => {
    const res = await call("POST", "/api/v1/auth/login", {
      body: ADMIN,
    });

    expect(res.status).toBe(200);
    adminCookies = extractCookies(res);
  });

  it("forbids the admin area for a regular user (403)", async () => {
    const res = await call("GET", "/api/v1/admin/users/search", {
      cookies: userCookies,
    });
    expect(res.status).toBe(403);
  });

  // ----------------------------------------------------------------- account

  it("updates the profile", async () => {
    const res = await call("PATCH", "/api/v1/account/update", {
      cookies: userCookies,
      body: { firstName: "Johnny" },
    });
    expect(res.status).toBe(204);

    const me = await call("GET", "/api/v1/account/me", {
      cookies: userCookies,
    });
    await expect(me.json()).resolves.toMatchObject({ firstName: "Johnny" });
  });

  it("rejects invalid profile data (400)", async () => {
    const res = await call("PATCH", "/api/v1/account/update", {
      cookies: userCookies,
      body: { firstName: "" },
    });
    expect(res.status).toBe(400);
  });

  it("sends an email verification token", async () => {
    const res = await call("POST", "/api/v1/account/send-email-verification", {
      cookies: userCookies,
    });

    expect(res.status).toBe(204);
    expect(h.sendEmailWithTemplate).toHaveBeenCalledWith(
      USER.email,
      "email_verification_code",
      { token: expect.any(String) },
    );
  });

  it("refuses to send a second verification while one is pending", async () => {
    const res = await call("POST", "/api/v1/account/send-email-verification", {
      cookies: userCookies,
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: "Email verification already exists",
    });
  });

  it("rejects a wrong verification token", async () => {
    const res = await call("POST", "/api/v1/account/check-email-verification", {
      cookies: userCookies,
      body: { token: "not-the-token" },
    });
    expect(res.status).toBe(400);
  });

  it("verifies the email with the emailed token", async () => {
    const row = [...h.fake!.store.emailVerifications.values()][0]!;

    const res = await call("POST", "/api/v1/account/check-email-verification", {
      cookies: userCookies,
      body: { token: row.token },
    });
    expect(res.status).toBe(204);

    const me = await call("GET", "/api/v1/account/me", {
      cookies: userCookies,
    });
    await expect(me.json()).resolves.toMatchObject({ isVerified: true });
  });

  it("refuses to verify an already verified email", async () => {
    const res = await call("POST", "/api/v1/account/send-email-verification", {
      cookies: userCookies,
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: "Email already verified",
    });
  });

  // ------------------------------------------------------------ admin: users

  it("lists users for the admin", async () => {
    const res = await call("GET", "/api/v1/admin/users/search", {
      cookies: adminCookies,
    });

    expect(res.status).toBe(200);
    const users = await res.json();
    expect(users).toHaveLength(2);
    expect(users.map((u: any) => u.email).sort()).toEqual(
      [ADMIN.email, USER.email].sort(),
    );
  });

  it("gets a user by id", async () => {
    const res = await call("GET", `/api/v1/admin/users/${userId}`, {
      cookies: adminCookies,
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ id: userId });
  });

  it("returns 404 for a missing user", async () => {
    const res = await call("GET", `/api/v1/admin/users/${TEST_UUID.missing}`, {
      cookies: adminCookies,
    });
    expect(res.status).toBe(404);
  });

  it("updates a user's profile fields", async () => {
    const res = await call("PATCH", `/api/v1/admin/users/${userId}`, {
      cookies: adminCookies,
      body: { phone: "+380671112233" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      id: userId,
      phone: "+380671112233",
    });
  });

  it("forbids the admin from changing their own role", async () => {
    const res = await call("PATCH", `/api/v1/admin/users/${TEST_UUID.admin}`, {
      cookies: adminCookies,
      body: { role: "USER" },
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: "Cannot change your own status or role",
    });
  });

  it("rejects an empty update body (400)", async () => {
    const res = await call("PATCH", `/api/v1/admin/users/${userId}`, {
      cookies: adminCookies,
      body: {},
    });
    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------- admin: catalog

  it("creates a category as admin", async () => {
    const res = await call("POST", "/api/v1/admin/categories", {
      cookies: adminCookies,
      body: { name: "Pizza", description: "All the pizzas" },
    });

    expect(res.status).toBe(201);
    const category = await res.json();
    expect(category).toMatchObject({ name: "Pizza", parent: null });
    categoryId = category.id;
  });

  it("creates a nested child category", async () => {
    const res = await call("POST", "/api/v1/admin/categories", {
      cookies: adminCookies,
      body: { name: "Vegan Pizza", parentId: categoryId },
    });

    expect(res.status).toBe(201);
    const child = await res.json();
    expect(child.parent).toMatchObject({ id: categoryId, name: "Pizza" });
    childCategoryId = child.id;
  });

  it("rejects a child category with a missing parent (404)", async () => {
    const res = await call("POST", "/api/v1/admin/categories", {
      cookies: adminCookies,
      body: { name: "Ghost", parentId: TEST_UUID.missing },
    });
    expect(res.status).toBe(404);
  });

  it("searches and gets categories as admin", async () => {
    const search = await call("GET", "/api/v1/admin/categories/search", {
      cookies: adminCookies,
    });
    expect(search.status).toBe(200);
    expect(await search.json()).toHaveLength(2);

    const byId = await call("GET", `/api/v1/admin/categories/${categoryId}`, {
      cookies: adminCookies,
    });
    expect(byId.status).toBe(200);
    await expect(byId.json()).resolves.toMatchObject({ name: "Pizza" });
  });

  it("updates a category", async () => {
    const res = await call("PATCH", `/api/v1/admin/categories/${categoryId}`, {
      cookies: adminCookies,
      body: { description: "Round and square" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      description: "Round and square",
    });
  });

  it("rejects making a category its own parent (400)", async () => {
    const res = await call("PATCH", `/api/v1/admin/categories/${categoryId}`, {
      cookies: adminCookies,
      body: { parentId: categoryId },
    });
    expect(res.status).toBe(400);
  });

  it("creates a product as admin", async () => {
    const res = await call("POST", "/api/v1/admin/products", {
      cookies: adminCookies,
      body: {
        name: "Pizza Margherita",
        description: "Tomato, mozzarella, basil",
        price: 9.99,
        categoryId,
      },
    });

    expect(res.status).toBe(201);
    const product = await res.json();
    expect(product).toMatchObject({
      name: "Pizza Margherita",
      isAvailable: true,
      category: { id: categoryId, name: "Pizza" },
    });
    productId = product.id;
  });

  it("rejects a product for a missing category (404)", async () => {
    const res = await call("POST", "/api/v1/admin/products", {
      cookies: adminCookies,
      body: {
        name: "Ghost",
        description: "No category",
        price: 1,
        categoryId: TEST_UUID.missing,
      },
    });
    expect(res.status).toBe(404);
  });

  it("searches and gets products as admin", async () => {
    const search = await call(
      "GET",
      `/api/v1/admin/products/search?categoryId=${categoryId}`,
      { cookies: adminCookies },
    );
    expect(search.status).toBe(200);
    const products = await search.json();
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ id: productId });

    const byId = await call("GET", `/api/v1/admin/products/${productId}`, {
      cookies: adminCookies,
    });
    expect(byId.status).toBe(200);
    await expect(byId.json()).resolves.toMatchObject({
      name: "Pizza Margherita",
    });
  });

  it("updates the product price", async () => {
    const res = await call("PATCH", `/api/v1/admin/products/${productId}`, {
      cookies: adminCookies,
      body: { price: 12.49 },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ price: 12.49 });
  });

  // ---------------------------------------------------------- client catalog

  it("finds the category through the client catalog", async () => {
    const search = await call("GET", "/api/v1/categories/search?name=pizza", {
      cookies: userCookies,
    });
    expect(search.status).toBe(200);
    const categories = await search.json();
    expect(categories.map((c: any) => c.id)).toContain(categoryId);

    const byId = await call("GET", `/api/v1/categories/${categoryId}`, {
      cookies: userCookies,
    });
    expect(byId.status).toBe(200);
    const category = await byId.json();
    expect(category.children).toEqual([
      { id: childCategoryId, name: "Vegan Pizza" },
    ]);
  });

  it("returns 404 for a missing category", async () => {
    const res = await call("GET", `/api/v1/categories/${TEST_UUID.missing}`, {
      cookies: userCookies,
    });
    expect(res.status).toBe(404);
  });

  it("finds the product through the client catalog search", async () => {
    const res = await call(
      "GET",
      "/api/v1/products/search?name=margherita&page=1&limit=10",
      { cookies: userCookies },
    );

    expect(res.status).toBe(200);
    const products = await res.json();
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ id: productId, price: 12.49 });
  });

  it("gets a product by id and 404s on a missing one", async () => {
    const byId = await call("GET", `/api/v1/products/${productId}`, {
      cookies: userCookies,
    });
    expect(byId.status).toBe(200);

    const missing = await call("GET", `/api/v1/products/${TEST_UUID.missing}`, {
      cookies: userCookies,
    });
    expect(missing.status).toBe(404);
  });

  it("validates query params (400 on limit=0)", async () => {
    const res = await call("GET", "/api/v1/products/search?limit=0", {
      cookies: userCookies,
    });
    expect(res.status).toBe(400);
  });

  // ------------------------------------------------------------- client cart

  it("adds the product to the cart", async () => {
    const res = await call("POST", "/api/v1/cart/items", {
      cookies: userCookies,
      body: { productId, quantity: 2 },
    });

    expect(res.status).toBe(201);
    const cart = await res.json();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({
      quantity: 2,
      product: { id: productId },
    });
    cartItemId = cart.items[0].id;
  });

  it("rejects adding a missing product (404)", async () => {
    const res = await call("POST", "/api/v1/cart/items", {
      cookies: userCookies,
      body: { productId: TEST_UUID.missing, quantity: 1 },
    });
    expect(res.status).toBe(404);
  });

  it("increments the quantity when adding the same product again", async () => {
    const res = await call("POST", "/api/v1/cart/items", {
      cookies: userCookies,
      body: { productId, quantity: 1 },
    });

    expect(res.status).toBe(201);
    const cart = await res.json();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
  });

  it("updates the cart item quantity", async () => {
    const res = await call("PATCH", `/api/v1/cart/items/${cartItemId}`, {
      cookies: userCookies,
      body: { quantity: 1 },
    });

    expect(res.status).toBe(200);
    const cart = await res.json();
    expect(cart.items[0].quantity).toBe(1);
  });

  it("returns 404 when updating a foreign cart item", async () => {
    const res = await call("PATCH", `/api/v1/cart/items/${TEST_UUID.missing}`, {
      cookies: userCookies,
      body: { quantity: 1 },
    });
    expect(res.status).toBe(404);
  });

  it("removes the item from the cart", async () => {
    const res = await call("DELETE", `/api/v1/cart/items/${cartItemId}`, {
      cookies: userCookies,
    });

    expect(res.status).toBe(200);
    const cart = await res.json();
    expect(cart.items).toEqual([]);
  });

  // -------------------------------------------------------------- admin cart

  it("lets the admin add an item to the user's cart", async () => {
    const res = await call("POST", `/api/v1/admin/cart/${userId}/items`, {
      cookies: adminCookies,
      body: { productId, quantity: 2 },
    });

    expect(res.status).toBe(201);
    const cart = await res.json();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ productId, quantity: 2 });
    cartItemId = cart.items[0].id;
  });

  it("lets the admin update the item quantity", async () => {
    const res = await call(
      "PATCH",
      `/api/v1/admin/cart/${userId}/items/${cartItemId}`,
      { cookies: adminCookies, body: { quantity: 4 } },
    );

    expect(res.status).toBe(200);
    const cart = await res.json();
    expect(cart.items[0].quantity).toBe(4);
  });

  it("lets the admin delete a wrong item after re-adding the right one", async () => {
    const deleted = await call(
      "DELETE",
      `/api/v1/admin/cart/${userId}/items/${cartItemId}`,
      { cookies: adminCookies },
    );
    expect(deleted.status).toBe(200);

    const reAdded = await call("POST", `/api/v1/admin/cart/${userId}/items`, {
      cookies: adminCookies,
      body: { productId, quantity: 2 },
    });
    expect(reAdded.status).toBe(201);
  });

  it("returns 404 when managing the cart of a missing user", async () => {
    const res = await call("GET", `/api/v1/admin/cart/${TEST_UUID.missing}`, {
      cookies: adminCookies,
    });
    expect(res.status).toBe(404);
  });

  it("lets the admin read the user's cart", async () => {
    const res = await call("GET", `/api/v1/admin/cart/${userId}`, {
      cookies: adminCookies,
    });

    expect(res.status).toBe(200);
    const cart = await res.json();
    expect(cart).toMatchObject({ userId });
    expect(cart.items).toHaveLength(1);
  });

  // -------------------------------------------------------- checkout + order

  it("checks out the cart into a PENDING order and clears the cart", async () => {
    const res = await call("POST", "/api/v1/orders", { cookies: userCookies });

    expect(res.status).toBe(201);
    const order = await res.json();
    expect(order).toMatchObject({ status: "PENDING" });
    expect(order.items).toHaveLength(1);
    expect(order.items[0].product).toMatchObject({ id: productId });
    orderId = order.id;

    const cartRes = await call("GET", "/api/v1/cart", { cookies: userCookies });
    const cart = await cartRes.json();
    expect(cart.items).toEqual([]);
  });

  it("refuses to check out an empty cart", async () => {
    const res = await call("POST", "/api/v1/orders", { cookies: userCookies });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Cart is empty" });
  });

  it("lists the order in the user's history and by id", async () => {
    const list = await call("GET", "/api/v1/orders?status=PENDING", {
      cookies: userCookies,
    });
    expect(list.status).toBe(200);
    const orders = await list.json();
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe(orderId);

    const byId = await call("GET", `/api/v1/orders/${orderId}`, {
      cookies: userCookies,
    });
    expect(byId.status).toBe(200);
  });

  it("returns 404 when the user fetches a foreign order", async () => {
    const res = await call("GET", `/api/v1/orders/${TEST_UUID.missing}`, {
      cookies: userCookies,
    });
    expect(res.status).toBe(404);
  });

  it("rejects a non-CANCELLED body on the cancel endpoint", async () => {
    const res = await call("PATCH", `/api/v1/orders/${orderId}`, {
      cookies: userCookies,
      body: { status: "PENDING" },
    });
    expect(res.status).toBe(400);
  });

  it("cancels the pending order", async () => {
    const res = await call("PATCH", `/api/v1/orders/${orderId}`, {
      cookies: userCookies,
      body: { status: "CANCELLED" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: "CANCELLED" });
  });

  it("refuses to cancel an order that is no longer pending", async () => {
    const res = await call("PATCH", `/api/v1/orders/${orderId}`, {
      cookies: userCookies,
      body: { status: "CANCELLED" },
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: "Only pending orders can be cancelled",
    });
  });

  // ------------------------------------------------------------ admin orders

  it("creates an order for the user as admin", async () => {
    const res = await call("POST", "/api/v1/admin/orders", {
      cookies: adminCookies,
      body: { userId, items: [{ productId, quantity: 1 }] },
    });

    expect(res.status).toBe(201);
    const order = await res.json();
    expect(order).toMatchObject({ userId, status: "PENDING" });
    adminOrderId = order.id;
  });

  it("rejects an admin order with duplicate products (400)", async () => {
    const res = await call("POST", "/api/v1/admin/orders", {
      cookies: adminCookies,
      body: {
        userId,
        items: [
          { productId, quantity: 1 },
          { productId, quantity: 2 },
        ],
      },
    });
    expect(res.status).toBe(400);
  });

  it("lets the admin move the order to any status", async () => {
    const res = await call("PATCH", `/api/v1/admin/orders/${orderId}`, {
      cookies: adminCookies,
      body: { status: "REFUNDED" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      id: orderId,
      status: "REFUNDED",
    });
  });

  it("finds the orders via the admin search", async () => {
    const refunded = await call(
      "GET",
      `/api/v1/admin/orders/search?status=REFUNDED&userId=${userId}`,
      { cookies: adminCookies },
    );
    expect(refunded.status).toBe(200);
    const orders = await refunded.json();
    expect(orders.map((o: any) => o.id)).toContain(orderId);

    const pending = await call(
      "GET",
      "/api/v1/admin/orders/search?status=PENDING",
      { cookies: adminCookies },
    );
    const pendingOrders = await pending.json();
    expect(pendingOrders.map((o: any) => o.id)).toContain(adminOrderId);
  });

  it("gets an order by id as admin", async () => {
    const res = await call("GET", `/api/v1/admin/orders/${orderId}`, {
      cookies: adminCookies,
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ id: orderId });
  });

  it("protects the product from deletion while it is referenced by orders", async () => {
    const res = await call("DELETE", `/api/v1/admin/products/${productId}`, {
      cookies: adminCookies,
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: "Cannot delete product in orders",
    });
  });

  it("protects the category from deletion while it has products", async () => {
    const res = await call(
      "DELETE",
      `/api/v1/admin/categories/${categoryId}`,
      { cookies: adminCookies },
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: "Cannot delete category with products",
    });
  });

  // --------------------------------------------------------- password reset

  it("sends a password reset email (public endpoint)", async () => {
    const res = await call("POST", "/api/v1/account/send-password-reset", {
      body: { email: USER.email },
    });

    expect(res.status).toBe(204);
    expect(h.sendEmailWithTemplate).toHaveBeenCalledWith(
      USER.email,
      "email_password_reset",
      { token: expect.any(String) },
    );
  });

  it("returns 404 for a password reset of an unknown email", async () => {
    const res = await call("POST", "/api/v1/account/send-password-reset", {
      body: { email: "ghost@example.com" },
    });
    expect(res.status).toBe(404);
  });

  it("rejects a wrong reset token", async () => {
    const res = await call("POST", "/api/v1/account/check-password-reset", {
      body: { token: "not-the-token", newPassword: NEW_PASSWORD },
    });
    expect(res.status).toBe(400);
  });

  it("rejects a weak new password (400)", async () => {
    const row = [...h.fake!.store.passwordResets.values()][0]!;
    const res = await call("POST", "/api/v1/account/check-password-reset", {
      body: { token: row.token, newPassword: "weak" },
    });
    expect(res.status).toBe(400);
  });

  it("resets the password with the emailed token and revokes sessions", async () => {
    const resetRow = [...h.fake!.store.passwordResets.values()][0]!;
    expect(resetRow.changedAt).toBeNull();

    const res = await call("POST", "/api/v1/account/check-password-reset", {
      body: { token: resetRow.token, newPassword: NEW_PASSWORD },
    });

    expect(res.status).toBe(204);
    expect(
      h.fake!.store.passwordResets.get(resetRow.id)!.changedAt,
    ).not.toBeNull();
    expect(h.fake!.store.sessions.size).toBe(1); // only the admin session survives
  });

  it("accepts the new password and rejects the old one on login", async () => {
    const oldLogin = await call("POST", "/api/v1/auth/login", {
      body: { email: USER.email, password: USER.password },
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await call("POST", "/api/v1/auth/login", {
      body: { email: USER.email, password: NEW_PASSWORD },
    });
    expect(newLogin.status).toBe(200);
    userCookies = mergeCookies(userCookies, newLogin);
  });

  // -------------------------------------------------------- refresh + logout

  it("rotates the token pair on refresh and invalidates the old refresh token", async () => {
    const oldRefreshCookie = userCookies
      .split("; ")
      .find((pair) => pair.startsWith("refreshToken="))!;

    const res = await call("POST", "/api/v1/auth/refresh-token", {
      cookies: userCookies,
    });
    expect(res.status).toBe(204);
    userCookies = mergeCookies(userCookies, res);

    const reuse = await call("POST", "/api/v1/auth/refresh-token", {
      cookies: oldRefreshCookie,
    });
    expect(reuse.status).toBe(401);
  });

  it("logs out and rejects the dead session afterwards", async () => {
    const logout = await call("POST", "/api/v1/auth/logout", {
      cookies: userCookies,
    });
    expect(logout.status).toBe(204);

    const refresh = await call("POST", "/api/v1/auth/refresh-token", {
      cookies: userCookies,
    });
    expect(refresh.status).toBe(401);
  });

  // ------------------------------------------------------------- user delete

  it("forbids the admin from deleting their own account", async () => {
    const res = await call("DELETE", `/api/v1/admin/users/${TEST_UUID.admin}`, {
      cookies: adminCookies,
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: "Cannot delete your own account",
    });
  });

  it("soft-deletes the user, blocking both login and existing tokens", async () => {
    const res = await call("DELETE", `/api/v1/admin/users/${userId}`, {
      cookies: adminCookies,
    });
    expect(res.status).toBe(204);

    const me = await call("GET", "/api/v1/account/me", {
      cookies: userCookies,
    });
    expect(me.status).toBe(403);

    const login = await call("POST", "/api/v1/auth/login", {
      body: { email: USER.email, password: NEW_PASSWORD },
    });
    expect(login.status).toBe(403);
    await expect(login.json()).resolves.toEqual({
      message: "Account is not active",
    });
  });

  it("rejects deleting the same user twice", async () => {
    const res = await call("DELETE", `/api/v1/admin/users/${userId}`, {
      cookies: adminCookies,
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: "User is already deleted",
    });
  });

  // ----------------------------------------------------------------- cleanup

  it("hard-deletes both orders and then the product and categories", async () => {
    for (const id of [orderId, adminOrderId]) {
      const res = await call("DELETE", `/api/v1/admin/orders/${id}`, {
        cookies: adminCookies,
      });
      expect(res.status).toBe(204);
    }

    const deleteProduct = await call(
      "DELETE",
      `/api/v1/admin/products/${productId}`,
      { cookies: adminCookies },
    );
    expect(deleteProduct.status).toBe(204);

    const deleteCategory = await call(
      "DELETE",
      `/api/v1/admin/categories/${categoryId}`,
      { cookies: adminCookies },
    );
    expect(deleteCategory.status).toBe(204);

    const deleteChild = await call(
      "DELETE",
      `/api/v1/admin/categories/${childCategoryId}`,
      { cookies: adminCookies },
    );
    expect(deleteChild.status).toBe(204);

    const search = await call("GET", "/api/v1/admin/products/search", {
      cookies: adminCookies,
    });
    await expect(search.json()).resolves.toEqual([]);
  });
});
