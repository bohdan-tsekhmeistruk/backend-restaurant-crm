import { beforeEach, describe, expect, it } from "vitest";
import ordersService from "src/v1/client/modules/orders/orders.service.js";
import {
  asPrisma,
  createPrismaMock,
  type PrismaMock,
} from "../../helpers/prisma-mock.js";
import { expectHttpError } from "../../helpers/assert.js";
import { TEST_UUID } from "../../helpers/http.js";

const ORDER = {
  id: TEST_UUID.order,
  status: "PENDING",
  items: [
    {
      id: "oi-1",
      quantity: 2,
      product: {
        id: TEST_UUID.product,
        name: "Pizza",
        image: null,
        price: 9.99,
      },
    },
  ],
};

describe("Client OrdersService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe("getMyOrders", () => {
    it("lists only the current user's orders, newest first", async () => {
      prisma.order.findMany.mockResolvedValue([ORDER]);

      const result = await ordersService.getMyOrders(
        asPrisma(prisma),
        TEST_UUID.user,
        { page: 1, limit: 20 },
      );

      expect(result).toEqual([ORDER]);
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: TEST_UUID.user },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 0,
        select: expect.anything(),
      });
    });

    it("applies the status filter and pagination", async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await ordersService.getMyOrders(asPrisma(prisma), TEST_UUID.user, {
        status: "DELIVERED",
        page: 4,
        limit: 5,
      });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: TEST_UUID.user, status: "DELIVERED" },
          take: 5,
          skip: 15,
        }),
      );
    });
  });

  describe("getMyOrderById", () => {
    it("scopes the lookup to the owner", async () => {
      prisma.order.findFirst.mockResolvedValue(ORDER);

      const result = await ordersService.getMyOrderById(
        asPrisma(prisma),
        TEST_UUID.user,
        TEST_UUID.order,
      );

      expect(result).toEqual(ORDER);
      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: { id: TEST_UUID.order, userId: TEST_UUID.user },
        select: expect.anything(),
      });
    });

    it("throws 404 for a foreign or missing order", async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expectHttpError(
        ordersService.getMyOrderById(
          asPrisma(prisma),
          TEST_UUID.user,
          TEST_UUID.missing,
        ),
        404,
        "Order not found",
      );
    });
  });

  describe("createMyOrder", () => {
    it("rejects when the cart does not exist", async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expectHttpError(
        ordersService.createMyOrder(asPrisma(prisma), TEST_UUID.user),
        400,
        "Cart is empty",
      );
    });

    it("rejects an empty cart", async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: TEST_UUID.cart, items: [] });

      await expectHttpError(
        ordersService.createMyOrder(asPrisma(prisma), TEST_UUID.user),
        400,
        "Cart is empty",
      );
    });

    it("rejects a cart containing unavailable products", async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: TEST_UUID.cart,
        items: [
          {
            productId: TEST_UUID.product,
            quantity: 1,
            product: { isAvailable: false },
          },
        ],
      });

      await expectHttpError(
        ordersService.createMyOrder(asPrisma(prisma), TEST_UUID.user),
        400,
        "Some products in the cart are not available",
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("creates the order from the cart and clears the cart atomically", async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: TEST_UUID.cart,
        items: [
          {
            productId: TEST_UUID.product,
            quantity: 2,
            product: { isAvailable: true },
          },
          {
            productId: TEST_UUID.category,
            quantity: 1,
            product: { isAvailable: true },
          },
        ],
      });
      prisma.order.create.mockResolvedValue(ORDER);
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });

      const result = await ordersService.createMyOrder(
        asPrisma(prisma),
        TEST_UUID.user,
      );

      expect(result).toEqual(ORDER);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: {
          userId: TEST_UUID.user,
          items: {
            create: [
              { productId: TEST_UUID.product, quantity: 2 },
              { productId: TEST_UUID.category, quantity: 1 },
            ],
          },
        },
        select: expect.anything(),
      });
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: TEST_UUID.cart },
      });
    });
  });

  describe("cancelMyOrder", () => {
    it("throws 404 when the order is missing or foreign", async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expectHttpError(
        ordersService.cancelMyOrder(
          asPrisma(prisma),
          TEST_UUID.user,
          TEST_UUID.order,
        ),
        404,
        "Order not found",
      );
    });

    it.each(["COOKING", "DELIVERED", "COMPLETED", "REFUNDED"])(
      "rejects cancelling a %s order",
      async (status) => {
        prisma.order.findFirst.mockResolvedValue({
          id: TEST_UUID.order,
          status,
        });

        await expectHttpError(
          ordersService.cancelMyOrder(
            asPrisma(prisma),
            TEST_UUID.user,
            TEST_UUID.order,
          ),
          400,
          "Only pending orders can be cancelled",
        );
        expect(prisma.order.update).not.toHaveBeenCalled();
      },
    );

    it("cancels a pending order", async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: TEST_UUID.order,
        status: "PENDING",
      });
      prisma.order.update.mockResolvedValue({ ...ORDER, status: "CANCELLED" });

      const result = await ordersService.cancelMyOrder(
        asPrisma(prisma),
        TEST_UUID.user,
        TEST_UUID.order,
      );

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.order },
        data: { status: "CANCELLED" },
        select: expect.anything(),
      });
      expect(result.status).toBe("CANCELLED");
    });
  });
});
