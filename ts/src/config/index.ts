import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// Minimal config shape to start; accepts unknown keys for forward compatibility
const CloudflaredConfigSchema = z
  .object({
    tunnel: z.string().optional(),
    credentials_file: z.string().optional(),
    logfile: z.string().optional(),
    originRequest: z
      .object({
        noTLSVerify: z.boolean().optional(),
        connectTimeout: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export type CloudflaredConfig = z.infer<typeof CloudflaredConfigSchema>;

export async function loadConfig(path: string): Promise<CloudflaredConfig> {
  const absolutePath = resolve(process.cwd(), path);
  const raw = await readFile(absolutePath, 'utf8');
  const parsed = parseYaml(raw) as unknown;
  return CloudflaredConfigSchema.parse(parsed);
}

export async function validateConfig(path: string): Promise<{ valid: true } | { valid: false; error: string }> {
  try {
    await loadConfig(path);
    return { valid: true } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, error: message } as const;
  }
}

