export const definition = {
	Name: "nodejs",
	Expression: "0 */5 * * * *",
	Description: "Checks new releases of nodejs, and if one is detected, then posts it in chat.",
	Defer: null,
	Type: "Bot",
	Code: (async function checkLastNodeVersion () {
		const { handleSubscription } = await import("../subscription-utils.mjs");
		this.data.isTableAvailable ??= await sb.Query.isTablePresent("data", "Event_Subscription");
		if (this.data.isTableAvailable === false) {
			this.stop();
			return;
		}

		const response = await sb.Got("GitHub", {
			url: "repos/nodejs/node/releases"
		});

		if (!response.ok) {
			return;
		}

		const data = response.body.sort((a, b) => new sb.Date(b.created_at) - new sb.Date(a.created_at));
		const latest = data[0];

		if (latest.tag_name === sb.Config.get("LATEST_NODE_JS_VERSION")) {
			return;
		}

		await sb.Config.set("LATEST_NODE_JS_VERSION", latest.tag_name);

		const releaseDate = new sb.Date(latest.created_at).format("Y-m-d H:i");
		const message = `New Node.js version detected! PagChomp 👉 ${latest.tag_name}; Released on ${releaseDate}; Changelog: ${latest.html_url}`;

		await handleSubscription("Node.js updates", message);
	})
};
