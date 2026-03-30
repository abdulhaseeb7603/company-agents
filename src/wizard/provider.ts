import inquirer from "inquirer";
import { fatal } from "../utils/log.js";

const MODELS: Record<string, Array<{ name: string; value: string }>> = {
  openrouter: [
    { name: "nvidia/nemotron-3-super-120b-a12b:free  (Free)", value: "nvidia/nemotron-3-super-120b-a12b:free" },
    { name: "deepseek/deepseek-chat-v3-0324:free     (Free)", value: "deepseek/deepseek-chat-v3-0324:free" },
    { name: "google/gemini-2.5-flash                 (Free)", value: "google/gemini-2.5-flash" },
    { name: "meta-llama/llama-4-maverick:free        (Free)", value: "meta-llama/llama-4-maverick:free" },
    { name: "qwen/qwen3-235b-a22b:free              (Free)", value: "qwen/qwen3-235b-a22b:free" },
    { name: "anthropic/claude-sonnet-4               (Paid)", value: "anthropic/claude-sonnet-4" },
    { name: "anthropic/claude-haiku-4                (Paid)", value: "anthropic/claude-haiku-4" },
    { name: "google/gemini-2.5-pro                   (Paid)", value: "google/gemini-2.5-pro" },
    { name: "--- Enter a custom model ID ---", value: "__custom__" },
  ],
  anthropic: [
    { name: "claude-sonnet-4-20250514", value: "claude-sonnet-4-20250514" },
    { name: "claude-haiku-4-20250414", value: "claude-haiku-4-20250414" },
    { name: "--- Enter a custom model ID ---", value: "__custom__" },
  ],
  openai: [
    { name: "gpt-4o", value: "gpt-4o" },
    { name: "gpt-4o-mini", value: "gpt-4o-mini" },
    { name: "o3-mini", value: "o3-mini" },
    { name: "--- Enter a custom model ID ---", value: "__custom__" },
  ],
};

export async function promptProvider(): Promise<{
  provider: string;
  apiKey: string;
  model: string;
}> {
  const { provider } = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "LLM Provider:",
      choices: [
        { name: "OpenRouter (200+ models, free options)", value: "openrouter" },
        { name: "Anthropic", value: "anthropic" },
        { name: "OpenAI", value: "openai" },
      ],
    },
  ]);

  const { apiKey } = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: "API Key:",
      mask: "*",
      validate: (input: string) => input.length > 0 || "API key is required",
    },
  ]);

  const modelChoices = MODELS[provider] ?? [];
  if (modelChoices.length === 0) {
    fatal(`No models configured for provider "${provider}".`);
  }

  const { model: selectedModel } = await inquirer.prompt([
    {
      type: "list",
      name: "model",
      message: "Model:",
      choices: modelChoices,
    },
  ]);

  let model = selectedModel;
  if (model === "__custom__") {
    const { customModel } = await inquirer.prompt([
      {
        type: "input",
        name: "customModel",
        message: "Enter model ID (e.g. nvidia/nemotron-3-super-120b-a12b:free):",
        validate: (input: string) => input.length > 0 || "Model ID is required",
      },
    ]);
    model = customModel;
  }

  return { provider, apiKey, model };
}
