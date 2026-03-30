import shelljs from "shelljs";
import pc from "picocolors";
import ora from "ora";
import { PaperclipClient } from "../paperclip/client.js";
import { fatal } from "../utils/log.js";

interface DockerService {
  Name: string;
  State: string;
  Status: string;
}

export async function statusCommand(): Promise<void> {
  const spinner = ora("Checking services...").start();

  const result = shelljs.exec("docker compose ps --format json", { silent: true });
  if (result.code !== 0) {
    spinner.fail("Failed to get Docker status");
    fatal(result.stderr || "docker compose ps failed");
  }

  const raw = result.stdout.trim();
  let services: DockerService[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      services = parsed.filter(
        (item): item is DockerService =>
          item !== null && typeof item === "object" && "Name" in item && "State" in item && "Status" in item
      );
    } else if (parsed !== null && typeof parsed === "object" && "Name" in parsed && "State" in parsed && "Status" in parsed) {
      services = [parsed as DockerService];
    }
  } catch {
    // Fallback: try newline-delimited JSON (older Docker Compose)
    const lines = raw.split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const parsed: unknown = JSON.parse(line);
        if (parsed !== null && typeof parsed === "object" && "Name" in parsed && "State" in parsed && "Status" in parsed) {
          services.push(parsed as DockerService);
        }
      } catch { /* skip non-JSON lines */ }
    }
  }

  spinner.succeed("Docker services:");
  console.log("");
  console.log(
    `  ${pc.bold("Service".padEnd(30))} ${pc.bold("State".padEnd(12))} ${pc.bold("Status")}`
  );
  console.log(`  ${"─".repeat(60)}`);
  for (const svc of services) {
    const stateColor = svc.State === "running" ? pc.green : pc.red;
    console.log(
      `  ${svc.Name.padEnd(30)} ${stateColor(svc.State.padEnd(12))} ${svc.Status}`
    );
  }

  const healthSpinner = ora("Checking Paperclip health...").start();
  try {
    const client = new PaperclipClient("http://localhost:3100", "");
    const health = await client.healthCheck();
    healthSpinner.succeed(`Paperclip: ${pc.green(health.status)}${health.deploymentMode ? ` (${health.deploymentMode})` : ""}`);
  } catch {
    healthSpinner.fail("Paperclip health check failed");
  }
}
