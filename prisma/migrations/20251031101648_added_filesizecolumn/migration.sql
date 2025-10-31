-- DropIndex
DROP INDEX "public"."Episode_tmdbEpisodeId_key";

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "filesize" TEXT DEFAULT '';

-- CreateIndex
CREATE INDEX "Episode_tmdbEpisodeId_idx" ON "Episode"("tmdbEpisodeId");

-- CreateIndex
CREATE INDEX "Episode_seasonId_episodeNumber_idx" ON "Episode"("seasonId", "episodeNumber");
