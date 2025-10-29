import { PrismaClient as SeriesClient } from "@prisma/series-client";

const globalForSeries = globalThis as unknown as { seriesPrisma: SeriesClient };

export const seriesPrisma =
  globalForSeries.seriesPrisma || new SeriesClient();

if (process.env.NODE_ENV !== "production")
  globalForSeries.seriesPrisma = seriesPrisma;
