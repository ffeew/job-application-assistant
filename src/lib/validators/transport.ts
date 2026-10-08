import { z } from "zod";

// JSON timestamps need separate schemas from domain Date objects.
export const serializedTimestamps = {
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};

export const profileRecordFields = {
  id: z.number(),
  userId: z.string(),
  ...serializedTimestamps,
};
