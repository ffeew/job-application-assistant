import { z } from "zod";

// Dates stay serialized on the client; domain response schemas keep Date objects.
export const serializedTimestamps = {
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};

export const profileRecordFields = {
  id: z.number(),
  userId: z.string(),
  ...serializedTimestamps,
};
