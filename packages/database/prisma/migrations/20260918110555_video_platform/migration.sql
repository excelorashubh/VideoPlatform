-- AlterTable
ALTER TABLE "CreatorApplication" ADD COLUMN     "profileImageKey" TEXT,
ALTER COLUMN "creatorName" DROP NOT NULL,
ALTER COLUMN "handle" DROP NOT NULL,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "bio" DROP NOT NULL;
