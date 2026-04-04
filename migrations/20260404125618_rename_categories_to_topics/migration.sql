/*
  Warnings:

  - You are about to drop the column `categories` on the `PostNote` table. All the data in the column will be lost.
  - You are about to drop the column `categories` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tagsList` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PostNote" DROP COLUMN "categories",
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" DROP COLUMN "categories",
DROP COLUMN "tagsList";
