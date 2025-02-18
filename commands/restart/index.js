module.exports = {
	Name: "restart",
	Aliases: null,
	Author: "supinic",
	Cooldown: 0,
	Description: "Restarts the bot/website process via pm2, optionally also git-pulls changes and/or upgrades the supi-core module.",
	Flags: ["system","whitelist"],
	Params: null,
	Whitelist_Response: "Only available to administrators!",
	Static_Data: (() => ({
		dir: {
			bot: "/code/supibot",
			web: "/code/web"
		},
		pm2: {
			bot: "pm2 restart supibot",
			web: "pm2 restart web"
		}
	})),
	Code: (async function restart (context, ...types) {
		const { promisify } = require("util");
		const shell = promisify(require("child_process").exec);
		const processType = (types.includes("web") || types.includes("site") || types.includes("website"))
			? "web"
			: "bot";

		types = types.map(i => i.toLowerCase());

		const queue = [];
		const dir = this.staticData.dir[processType];
		const pm2 = this.staticData.pm2[processType];

		if (processType === "bot" && types.includes("all")) {
			await context.sendIntermediateMessage("VisLaud 👉 yarn prod-update");
			const result = await shell(`yarn prod-update`);
			console.log("prod-update result", { stdout: result.stdout, stderr: result.stderr });
		}
		else {
			if (types.includes("all") || types.includes("pull") || types.includes("static")) {
				queue.push(async () => {
					await context.sendIntermediateMessage("VisLaud 👉 git pull origin master");

					await shell(`git -C ${dir} checkout -- yarn.lock package.json`);
					const result = await shell(`git -C ${dir} pull origin master`);
					console.log("pull result", { stdout: result.stdout, stderr: result.stderr });
				});
			}
			if (types.includes("all") || types.includes("yarn") || types.includes("upgrade")) {
				const { unlink } = require("fs/promises");
				queue.push(async () => {
					let message;
					try {
						await unlink("/code/supibot/yarn.lock");
						message = "deleted yarn.lock";
					}
					catch {
						message = "didn't delete yarn.lock";
					}

					await context.sendIntermediateMessage(`VisLaud 👉 ${message} VisLaud 👉 yarn`);

					const result = await shell(`yarn --cwd ${dir} workspaces focus -A --production`);
					console.log("upgrade result", { stdout: result.stdout, stderr: result.stderr });
				});
			}
		}

		let resultMessage = `Process ${processType} restarted successfully.`;
		if (!types.includes("static")) {
			queue.push(async () => {
				await context.sendIntermediateMessage("VisLaud 👉 Restarting process");
				setTimeout(() => shell(pm2), 1000);
			});
		}
		else {
			resultMessage = `Process ${processType} successfully updated from Git. (no restart)`;
		}

		for (const fn of queue) {
			await fn();
		}

		if (processType === "bot") {
			return null;
		}
		else {
			return {
				reply: resultMessage
			};
		}
	}),
	Dynamic_Description: null
};
