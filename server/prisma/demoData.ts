import type { PrismaClient } from "@prisma/client";

export interface SeedOptions {
  password: string;
  reset: boolean;
}

export function resolveSeedOptions(_env: Record<string, string | undefined>): SeedOptions {
  throw new Error("not implemented");
}

export async function seedDemo(_prisma: PrismaClient, _options: SeedOptions): Promise<void> {
  throw new Error("not implemented");
}
