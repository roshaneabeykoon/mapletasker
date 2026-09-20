-- AlterTable
ALTER TABLE "Tasker" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ALTER COLUMN "tokenBalance" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "taskerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_taskerId_idx" ON "EmailVerificationToken"("taskerId");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_taskerId_fkey" FOREIGN KEY ("taskerId") REFERENCES "Tasker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
