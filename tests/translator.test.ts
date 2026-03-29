import { describe, it, expect } from "vitest";
import { translateToSoul } from "../src/persona/translator.js";

const AGENCY_AGENTS_TEMPLATE = `---
name: Content Strategist
description: A content marketing specialist
color: "#4A90D9"
emoji: "✍️"
vibe: creative
---

## 🎭 Your Identity & Memory

You are a creative content strategist with expertise in digital marketing.
You craft compelling narratives that drive engagement.

## 🎯 Your Core Mission

Create data-driven content that resonates with target audiences and
drives measurable business outcomes.

## 🔄 Your Workflow Process

1. Research trending topics in the target industry
2. Analyze competitor content strategies
3. Draft content with clear value propositions
4. Optimize for SEO and readability

## 📦 Your Technical Deliverables

- Blog posts (1,000-2,000 words)
- Social media content calendars
- Newsletter templates
- Content performance reports

## 💬 Your Communication Style

Direct, data-informed, and creative. Lead with insights.

## 🚫 Critical Rules You Must Follow

- Never publish without fact-checking all claims
- Always cite data sources
- Avoid generic AI-sounding language

## 📊 Your Success Metrics

- Content engagement rate above 3%
- Monthly traffic growth of 15%
`;

describe("translateToSoul", () => {
  it("converts Identity section to # Personality", () => {
    const soul = translateToSoul(AGENCY_AGENTS_TEMPLATE, ["web", "file"], "Test Corp");
    expect(soul).toMatch(/^# Personality/m);
    expect(soul).toContain("creative content strategist");
  });

  it("converts Core Mission to ## Your Role", () => {
    const soul = translateToSoul(AGENCY_AGENTS_TEMPLATE, ["web"], "Test Corp");
    expect(soul).toContain("## Your Role");
    expect(soul).toContain("data-driven content");
  });

  it("converts Workflow Process to ## How You Work", () => {
    const soul = translateToSoul(AGENCY_AGENTS_TEMPLATE, ["web"], "Test Corp");
    expect(soul).toContain("## How You Work");
    expect(soul).toContain("Research trending topics");
  });

  it("converts Technical Deliverables to ## What You Deliver", () => {
    const soul = translateToSoul(AGENCY_AGENTS_TEMPLATE, ["web"], "Test Corp");
    expect(soul).toContain("## What You Deliver");
    expect(soul).toContain("Blog posts");
  });

  it("converts Communication Style", () => {
    const soul = translateToSoul(AGENCY_AGENTS_TEMPLATE, ["web"], "Test Corp");
    expect(soul).toContain("## Communication Style");
  });

  it("converts Critical Rules to ## What to Avoid", () => {
    const soul = translateToSoul(AGENCY_AGENTS_TEMPLATE, ["web"], "Test Corp");
    expect(soul).toContain("## What to Avoid");
    expect(soul).toContain("fact-checking");
  });

  it("adds ## Tools You Use section", () => {
    const soul = translateToSoul(AGENCY_AGENTS_TEMPLATE, ["web", "browser", "file"], "Test Corp");
    expect(soul).toContain("## Tools You Use");
    expect(soul).toContain("web");
  });

  it("strips YAML frontmatter", () => {
    const soul = translateToSoul(AGENCY_AGENTS_TEMPLATE, ["web"], "Test Corp");
    expect(soul).not.toContain("color:");
    expect(soul).not.toContain("#4A90D9");
    expect(soul).not.toContain("vibe:");
  });

  it("does not include Success Metrics in output", () => {
    const soul = translateToSoul(AGENCY_AGENTS_TEMPLATE, ["web"], "Test Corp");
    expect(soul).not.toContain("Success Metrics");
    expect(soul).not.toContain("engagement rate");
  });

  it("includes company name in Your Role section", () => {
    const soul = translateToSoul(AGENCY_AGENTS_TEMPLATE, ["web"], "Acme Inc");
    expect(soul).toContain("Acme Inc");
  });

  it("handles missing optional sections gracefully", () => {
    const minimal = `---
name: Basic Agent
description: test
---

## 🎭 Your Identity & Memory

You are a basic agent.

## 🎯 Your Core Mission

Do basic things.
`;
    const soul = translateToSoul(minimal, ["terminal"], "Test Co");
    expect(soul).toContain("# Personality");
    expect(soul).toContain("## Your Role");
  });
});
