const { addFish, addJunk, getInitialStats, rollCatch, saveData } = require("./fishing-utils.js");

const FISHING_TRIP_STATIC_DURATION = 36e5; // 1 hour

module.exports = {
	name: "trap",
	aliases: ["net", "trawl"],
	description: [
		`<code>$fish trap</code>`,
		"Lay down a bunch of fishing traps to catch fish for you.",
		"You can then come back after 1 hour to see what you got waiting for you!",
		"Beware! You cannot go regular fishing while your traps are set! You would be disturbing the catch.",
		"",

		`<code>$fish trap cancel</code>`,
		"If you have set up your fishing traps and don't want to continue, you can reel them back in with this command.",
		"Be warned though, you won't get any catch by removing them early!"
	],
	execute: async (context, operation) => {
		const fishData = await context.user.getDataProperty("fishData") ?? getInitialStats();
		if (!fishData.trap) {
			const { trap, lifetime } = getInitialStats();
			fishData.trap ??= trap;
			fishData.lifetime.trap ??= lifetime.trap;
		}

		const now = sb.Date.now();
		const { lifetime, trap } = fishData;

		if (operation === "cancel") {
			if (trap.active) {
				trap.active = false;
				trap.start = 0;
				trap.end = 0;
				lifetime.trap.cancelled++;

				await saveData(context, fishData);

				return {
					reply: `You have succesfully retrieved your traps before they filled up. You don't get any junk or fish.`
				};
			}
			else {
				return {
					success: false,
					reply: `You cannot cancel your fishing traps as you don't have them set up!`
				};
			}
		}

		if (!trap.active) { // Set up trap
			trap.active = true;
			trap.start = now;
			trap.end = now + FISHING_TRIP_STATIC_DURATION;
			trap.duration = FISHING_TRIP_STATIC_DURATION;
			lifetime.trap.times++;

			await saveData(context, fishData);

			const end = sb.Utils.timeDelta(trap.end, true);
			const emote = await context.getBestAvailableEmote(["PauseChamp"], "⌛");
			return {
				reply: `You have laid your fishing traps. Now we wait... ${emote} You can check them in about ${end}.`
			};
		}
		else if (now > trap.end) {
			const randomEfficiencyPercentage = sb.Utils.random(75, 90) / 100;
			const rolls = Math.floor(trap.duration / 60e3 * randomEfficiencyPercentage);

			const results = [];
			for (let i = 0; i < rolls; i++) {
				const item = rollCatch();
				if (!item.catch) {
					continue;
				}

				if (item.type === "fish") {
					i += 30; // "Lose" equivalent of 30 minutes fishing time
					addFish(fishData, item.catch.name);
					results.push(item.catch.name);
				}
				else if (item.type === "junk") {
					addJunk(fishData, item.catch.name);
					results.push(item.catch.name);
				}
			}

			lifetime.trap.times++;
			lifetime.trap.timeSpent += trap.duration;
			trap.active = false;
			trap.start = 0;
			trap.end = 0;
			trap.duration = 0;

			await saveData(context, fishData);

			return {
				reply: `You succesfully drag the traps out of the water and are rewarded with: ${results.join("")}`
			};
		}
		else {
			const delta = sb.Utils.timeDelta(trap.end);
			return {
				success: false,
				reply: sb.Utils.tag.trim `
					Your traps are not fully loaded yet! They will be ready to harvest ${delta}.
					If you wish to get rid of them immediately, use "$fish trap cancel", 
					but you will not get any catch from your traps.
				`
			};
		}
	}
};
