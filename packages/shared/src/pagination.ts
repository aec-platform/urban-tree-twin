import { z } from 'zod';

export const Page = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative().optional(),
  });

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}
