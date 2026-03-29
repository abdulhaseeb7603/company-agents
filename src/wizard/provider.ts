import inquirer from "inquirer";

const MODELS: Record<string, string[]> = {
  openrouter: [
    "anthropic/claude-sonnet-4",
    "anthropic/claude-haiku-4",
    "google/gemini-2.5-flash",
    "meta-llama/llama-4-maverick",
  ],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-haiku-4-20250414",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "o3-mini",
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
        { name: "OpenRouter (200+ models)", value: "openrouter" },
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

  const { model } = await inquirer.prompt([
    {
      type: "list",
      name: "model",
      message: "Model:",
      choices: MODELS[provider] ?? [],
    },
  ]);

  return { provider, apiKey, model };
}
