import { PrismaClient } from "@prisma/movies-client";
const globalForPrisma = globalThis;
export const prismaMovies = globalForPrisma.prismaMovies || new PrismaClient();
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prismaMovies = prismaMovies;
//# sourceMappingURL=prisma.js.map