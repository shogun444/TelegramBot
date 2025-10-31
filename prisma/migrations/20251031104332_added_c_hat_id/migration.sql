/*
  Warnings:

  - Added the required column `chat_id` to the `Episode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chat_id` to the `Season` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chat_id` to the `TVSeries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "chat_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "chat_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TVSeries" ADD COLUMN     "chat_id" TEXT NOT NULL;
