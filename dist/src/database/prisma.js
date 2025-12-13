import { PrismaClient } from '@prisma/client';
export const prisma = globalThis.__prisma ?? new PrismaClient();
if (!globalThis.__prisma) {
    globalThis.__prisma = prisma;
}
//# sourceMappingURL=prisma.js.map