/*
  Warnings:

  - A unique constraint covering the columns `[fileId]` on the table `PostNote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PostNote" ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "imageKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PostNote_fileId_key" ON "PostNote"("fileId");

-- AddForeignKey
ALTER TABLE "PostNote" ADD CONSTRAINT "PostNote_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
