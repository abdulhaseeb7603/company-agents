import shelljs from "shelljs";
import ora from "ora";
import { fatal } from "../utils/log.js";

export async function updateCommand(): Promise<void> {
  const pullSpinner = ora("Pulling latest images...").start();
  const pullResult = shelljs.exec("docker compose pull", { silent: true });
  if (pullResult.code !== 0) {
    pullSpinner.fail("Failed to pull images");
    fatal(pullResult.stderr || "docker compose pull failed");
  }
  pullSpinner.succeed("Pulled latest images");

  const upSpinner = ora("Restarting services...").start();
  const upResult = shelljs.exec("docker compose up -d", { silent: true });
  if (upResult.code !== 0) {
    upSpinner.fail("Failed to restart services");
    fatal(upResult.stderr || "docker compose up -d failed");
  }
  upSpinner.succeed("Services restarted with latest images");
}
