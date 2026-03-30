import shelljs from "shelljs";
import pc from "picocolors";
import { fatal } from "../utils/log.js";

export function logsCommand(agent: string): void {
  const safeSlug = agent.replace(/[^a-z0-9-]/gi, "");
  console.log(pc.bold(`\nLogs for agent: ${safeSlug}\n`));

  const result = shelljs.exec(
    `docker compose logs zeroclaw --tail 100 2>&1 | grep -i "${safeSlug}"`,
    { silent: true }
  );

  if (result.code !== 0 && result.stdout.trim() === "") {
    fatal(`No logs found for agent "${agent}". Is the worker running?`);
  }

  const output = result.stdout.trim();
  if (output) {
    console.log(output);
  } else {
    console.log(pc.yellow("No matching log lines found."));
  }
  console.log("");
}
