import fs from "fs/promises";
import shelljs from "shelljs";
import pc from "picocolors";
import { success, warn } from "../utils/log.js";

interface CheckResult {
  ok: boolean;
  message: string;
}

export function checkDocker(): CheckResult {
  const result = shelljs.exec("docker --version", { silent: true });
  if (result.code !== 0) {
    return { ok: false, message: "Docker is not installed" };
  }
  return { ok: true, message: result.stdout.trim() };
}

export function checkDockerRunning(): CheckResult {
  const result = shelljs.exec("docker info", { silent: true });
  if (result.code !== 0) {
    return { ok: false, message: "Docker daemon is not running" };
  }
  return { ok: true, message: "Docker is running" };
}

async function checkFileExists(filePath: string, label: string): Promise<CheckResult> {
  try {
    await fs.access(filePath);
    return { ok: true, message: `${label} exists` };
  } catch {
    return { ok: false, message: `${label} not found` };
  }
}

export async function checkPort(port: number): Promise<CheckResult> {
  try {
    const response = await fetch(`http://localhost:${port}/api/health`);
    if (response.ok) {
      return { ok: true, message: `Port ${port} is reachable` };
    }
    return { ok: false, message: `Port ${port} returned status ${response.status}` };
  } catch {
    return { ok: false, message: `Port ${port} is not reachable` };
  }
}

function printResult(result: CheckResult): void {
  if (result.ok) {
    success(result.message);
  } else {
    warn(result.message);
  }
}

export async function doctorCommand(): Promise<void> {
  console.log(`\n  ${pc.bold("HermesOps Doctor")}\n`);

  const dockerCheck = checkDocker();
  printResult(dockerCheck);

  if (dockerCheck.ok) {
    const runningCheck = checkDockerRunning();
    printResult(runningCheck);
  }

  const envCheck = await checkFileExists(".env", ".env");
  printResult(envCheck);

  const composeCheck = await checkFileExists("docker-compose.yml", "docker-compose.yml");
  printResult(composeCheck);

  const portCheck = await checkPort(3100);
  printResult(portCheck);

  const agentsCheck = await checkFileExists("agents", "agents directory");
  printResult(agentsCheck);

  console.log("");
}
