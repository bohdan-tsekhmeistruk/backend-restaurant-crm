import { beforeEach, describe, expect, it } from "vitest";
import ordersService from "src/v1/admin/modules/orders/orders.service.js";
import {
  asPrisma,
  createPrismaMock,
  type PrismaMock,
} from "../../helpers/prisma-mock.js";
import { expectHttpError } from "../../helpers/assert.js";
import { TEST_UUID } from "../../helpers/http.js";

const ORDER = { id: TEST_UUID.order, userId: TEST_UUID.user, status: "PENDING" };

describe("Admin OrdersService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe("searchOrders", () => {
    it("filters by userId and status with pagination", async () => {
      prisma.order.findMany.mockResolvedValue([ORDER]);

      const result = await ordersService.searchOrders(asPrisma(prisma), {
        userId: TEST_UUID.user,
        status: "PENDING",
        page: 2,
        limit: 10,
      });

      expect(result).toEqual([ORDER]);
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: TEST_UUID.user, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 10,
        skip: 10,
        select: expect.anything(),
      });
    });

    it("queries all orders when no filters are given", async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await ordersService.searchOrders(asPrisma(prisma), { page: 1, limit: 20 });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe("getOrderById", () => {
    it("returns the order when found", async () => {
      prisma.order.findUnique.mockResolvedValue(ORDER);

      await expect(
        ordersService.getOrderById(asPrisma(prisma), TEST_UUID.order),
      ).resolves.toEqual(ORDER);
    });

    it("throws 404 when the order does not exist", async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expectHttpError(
        ordersService.getOrderById(asPrisma(prisma), TEST_UUID.missing),
        404,
        "Order not found",
      );
    });
  });

  describe("createOrder", () => {
    const body = {
      userId: TEST_UUID.user,
      items: [{ productId: TEST_UUID.product, quantity: 2 }],
    };

    it("throws 404 when the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectHttpError(
        ordersService.createOrder(asPrisma(prisma), body),
        404,
        "User not found",
      );
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it("throws 404 when some products are missing", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.product.findMany.mockResolvedValue([]);

      await expectHttpError(
        ordersService.createOrder(asPrisma(prisma), body),
        404,
        "Some products not found",
      );
    });

    it("rejects orders containing unavailable products", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.product.findMany.mockResolvedValue([
        { id: TEST_UUID.product, isAvailable: false },
      ]);

      await expectHttpError(
        ordersService.createOrder(asPrisma(prisma), body),
        400,
        "Some products are not available",
      );
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it("creates the order with nested items", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.product.findMany.mockResolvedValue([
        { id: TEST_UUID.product, isAvailable: true },
      ]);
      prisma.order.create.mockResolvedValue(ORDER);

      const result = await ordersService.createOrder(asPrisma(prisma), body);

      expect(result).toEqual(ORDER);
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: {
          userId: TEST_UUID.user,
          items: { create: body.items },
        },
        select: expect.anything(),
      });
    });
  });

  describe("updateOrder", () => {
    it("throws 404 when the order does not exist", async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expectHttpError(
        ordersService.updateOrder(asPrisma(prisma), TEST_UUID.missing, {
          status: "COOKING",
        }),
        404,
        "Order not found",
      );
    });

    it("sets any status without transition validation", async () => {
      prisma.order.findUnique.mockResolvedValue({ id: TEST_UUID.order });
      prisma.order.update.mockResolvedValue({ ...ORDER, status: "REFUNDED" });

      const result = await ordersService.updateOrder(
        asPrisma(prisma),
        TEST_UUID.order,
        { status: "REFUNDED" },
      );

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.order },
        data: { status: "REFUNDED" },
        select: expect.anything(),
      });
      expect(result.status).toBe("REFUNDED");
    });
  });

  describe("deleteOrder", () => {
    it("throws 404 when the order does not exist", async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expectHttpError(
        ordersService.deleteOrder(asPrisma(prisma), TEST_UUID.missing),
        404,
        "Order not found",
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("hard-deletes the order items and then the order", async () => {
      prisma.order.findUnique.mockResolvedValue({ id: TEST_UUID.order });
      prisma.orderItem.deleteMany.mockResolvedValue({ count: 2 });
      prisma.order.delete.mockResolvedValue({});

      await ordersService.deleteOrder(asPrisma(prisma), TEST_UUID.order);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { orderId: TEST_UUID.order },
      });
      expect(prisma.order.delete).toHaveBeenCalledWith({
        where: { id: TEST_UUID.order },
      });

      const deleteManyOrder =
        prisma.orderItem.deleteMany.mock.invocationCallOrder[0]!;
      const deleteOrder = prisma.order.delete.mock.invocationCallOrder[0]!;
      expect(deleteManyOrder).toBeLessThan(deleteOrder);
    });
  });
});
