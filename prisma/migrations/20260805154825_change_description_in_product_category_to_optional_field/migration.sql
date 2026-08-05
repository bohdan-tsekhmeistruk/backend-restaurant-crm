/*
  Warnings:

  - You are about to drop the column `emailVerificationId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `passwordResetId` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product_categories" ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "emailVerificationId",
DROP COLUMN "passwordResetId";
