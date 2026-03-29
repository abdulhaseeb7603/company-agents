import inquirer from "inquirer";

export async function promptDeployTarget(): Promise<"local" | "vps"> {
  const { target } = await inquirer.prompt([
    {
      type: "list",
      name: "target",
      message: "Deploy target:",
      choices: [
        { name: "Local Docker", value: "local" },
        { name: "VPS (SSH deploy)", value: "vps" },
      ],
    },
  ]);
  return target;
}
