-- DropIndex
DROP INDEX "email_verifications_user_id_key";

-- DropIndex
DROP INDEX "password_resets_user_id_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificationId" TEXT,
ADD COLUMN     "passwordResetId" TEXT;
