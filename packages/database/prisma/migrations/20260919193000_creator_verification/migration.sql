ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3), ADD COLUMN "phoneNumber" TEXT, ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);
ALTER TABLE "CreatorApplication" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
CREATE TABLE "VerificationChallenge" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "channel" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "VerificationChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VerificationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VerificationChallenge_userId_channel_consumedAt_idx" ON "VerificationChallenge"("userId", "channel", "consumedAt");
