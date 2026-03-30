import { z } from "zod";

export const AgentDefSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  role: z.enum([
    "ceo", "cto", "cmo", "cfo", "engineer",
    "designer", "pm", "qa", "devops",
    "researcher", "general",
  ]),
  soulTemplate: z.string().optional(),
  budget: z.number().min(1).max(500),
  heartbeat: z.string(),
  toolsets: z.array(z.enum([
    "terminal", "file", "web", "browser",
    "code_execution", "vision", "mcp",
    "image_gen", "tts", "todo", "cronjob", "memory",
  ])),
  internetTools: z.array(z.enum([
    "jina", "xreach", "yt-dlp", "searxng",
  ])).default([]),
  reportsTo: z.string().optional(),
  goals: z.array(z.string()).min(1),
});

export const CompanyTemplateSchema = z.object({
  name: z.string().min(1),
  mission: z.string().min(10),
  agents: z.array(AgentDefSchema).min(1),
});

export type AgentDef = z.infer<typeof AgentDefSchema>;
export type CompanyTemplate = z.infer<typeof CompanyTemplateSchema>;
