import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { BriefingConfig } from "./types.js";

const configSchema = z.object({
  org: z.string().default("EvoMap"),
  timezone: z.string().default("Asia/Shanghai"),
  window: z.string().default("24h"),
  comicStyle: z.literal("infographic-comic").default("infographic-comic"),
  includeRepos: z.array(z.string()).default([]),
  excludeRepos: z.array(z.string()).default([])
});

export const defaultConfig: BriefingConfig = {
  org: "EvoMap",
  timezone: "Asia/Shanghai",
  window: "24h",
  comicStyle: "infographic-comic",
  includeRepos: [],
  excludeRepos: []
};

export async function loadConfig(path = "briefing.config.json"): Promise<BriefingConfig> {
  if (!existsSync(path)) {
    return defaultConfig;
  }

  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return configSchema.parse(parsed);
}
