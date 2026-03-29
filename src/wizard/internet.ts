import inquirer from "inquirer";
import pc from "picocolors";

export async function promptInternetTools(): Promise<{
  tools: string[];
  enableSearxng: boolean;
}> {
  const { tools } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "tools",
      message: "Internet access:",
      choices: [
        { name: "Jina Reader — web page reading (free)", value: "jina", checked: true },
        { name: "xreach — Twitter/X access (cookie auth)", value: "xreach" },
        { name: "yt-dlp — YouTube transcripts", value: "yt-dlp" },
        { name: "SearXNG — private self-hosted search engine", value: "searxng" },
      ],
    },
  ]);

  if (tools.includes("xreach")) {
    console.error(
      `\n${pc.yellow("\u26A0")}  Twitter access uses cookie auth. Use a secondary account.`
    );
  }

  return {
    tools: tools.filter((t: string) => t !== "searxng"),
    enableSearxng: tools.includes("searxng"),
  };
}
