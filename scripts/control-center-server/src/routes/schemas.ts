import { z } from 'zod';

export const connectionSchema = z.object({
  id: z.number().int().min(1).max(20),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  password: z.string().optional(),
  enabled: z.boolean(),
  alias: z.string().optional()
});

export const globalSettingsSchema = z.object({
  scenePresets: z
    .array(z.string().min(1))
    .length(5)
});

export const settingsSchema = z.object({
  connections: z.array(connectionSchema).max(20),
  global: globalSettingsSchema
});

export const sceneSchema = z.object({
  sceneName: z.string().min(1)
});

export const muteSchema = z.object({
  muted: z.boolean()
});
