-- CreateEnum
CREATE TYPE "access_event" AS ENUM ('LINK_VIEWED', 'UNLOCK_SUCCEEDED', 'UNLOCK_FAILED', 'UNLOCK_LOCKED', 'FILE_UPLOADED', 'FILE_REJECTED');

-- CreateTable
CREATE TABLE "lawyers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cabinetName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lawyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_requests" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "expectedFiles" INTEGER NOT NULL,
    "pinHash" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "deposit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_files" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "event" "access_event" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lawyers_email_key" ON "lawyers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_requests_publicToken_key" ON "deposit_requests"("publicToken");

-- CreateIndex
CREATE INDEX "deposit_requests_lawyerId_createdAt_idx" ON "deposit_requests"("lawyerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_files_objectKey_key" ON "deposit_files"("objectKey");

-- CreateIndex
CREATE INDEX "deposit_files_requestId_uploadedAt_idx" ON "deposit_files"("requestId", "uploadedAt");

-- CreateIndex
CREATE INDEX "access_logs_requestId_createdAt_idx" ON "access_logs"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "lawyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_files" ADD CONSTRAINT "deposit_files_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "deposit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "deposit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
