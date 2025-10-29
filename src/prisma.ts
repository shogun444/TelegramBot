import { PrismaClient } from "@prisma/movies-client";

const globalForPrisma = globalThis as unknown as { prismaMovies: PrismaClient };

export const prismaMovies =
  globalForPrisma.prismaMovies || new PrismaClient();

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prismaMovies = prismaMovies;
