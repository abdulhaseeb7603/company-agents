interface Section {
  header: string;
  content: string;
}

const SECTION_MAP: Record<string, string> = {
  "Your Identity & Memory": "# Personality",
  "Your Core Mission": "## Your Role",
  "Your Workflow Process": "## How You Work",
  "Your Technical Deliverables": "## What You Deliver",
  "Your Communication Style": "## Communication Style",
  "Critical Rules You Must Follow": "## What to Avoid",
};

const EXCLUDED_SECTIONS = ["Your Success Metrics"];

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

function parseSections(markdown: string): Section[] {
  const sections: Section[] = [];
  const lines = markdown.split("\n");
  let currentHeader = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(?:[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*)?(.+)$/u);
    if (headerMatch) {
      if (currentHeader) {
        sections.push({ header: currentHeader, content: currentContent.join("\n").trim() });
      }
      currentHeader = headerMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeader) {
    sections.push({ header: currentHeader, content: currentContent.join("\n").trim() });
  }

  return sections;
}

export function translateToSoul(
  agencyAgentsMarkdown: string,
  toolsets: string[],
  companyName: string
): string {
  const body = stripFrontmatter(agencyAgentsMarkdown);
  const sections = parseSections(body);

  const output: string[] = [];

  for (const section of sections) {
    const mappedHeader = SECTION_MAP[section.header];
    if (!mappedHeader) {
      if (EXCLUDED_SECTIONS.some(ex => section.header.includes(ex))) {
        continue;
      }
      continue;
    }

    let content = section.content;

    if (mappedHeader === "## Your Role") {
      content = `You work at ${companyName}.\n\n${content}`;
    }

    output.push(`${mappedHeader}\n\n${content}`);
  }

  if (toolsets.length > 0) {
    const toolsList = toolsets.map(t => `- ${t}`).join("\n");
    output.push(`## Tools You Use\n\n${toolsList}`);
  }

  return output.join("\n\n") + "\n";
}
