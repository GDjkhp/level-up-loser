// Discord Bot by GDjkhp
// Features: xp system, insult generator, make it a quote
// Reach out GDjkhp#3732 on Discord for support

require('dotenv').config();
const {Client, Events, GatewayIntentBits} = require('discord.js');
const Levels = require('discord-xp');
const lvl = require('./messages.json');
const roast = require('./insults.json');
const config = require('./config.json');	
const canvacord = require('canvacord');
const requestHandler = require('axios').default;
Levels.setURL(process.env.DB);
const prefix = config.prefix;
const axios = requestHandler.create({
    timeout: 2000,
});
const client = new Client({ 
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildMessages, 
		GatewayIntentBits.MessageContent
	] 
});
const Canvas = require("@napi-rs/canvas");
const fs = require("fs");

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on("messageCreate", async (message) => {
	if (!message.guild) return;
	if (message.author.bot) return;

	const randomAmountOfXp = Math.floor(Math.random() * 29) + 1; // Min 1, Max 30
	const hasLeveledUp = await Levels.appendXp(message.author.id, message.guild.id, randomAmountOfXp);
	if (hasLeveledUp) {
		const user = await Levels.fetch(message.author.id, message.guild.id);
		message.channel.send({ content: levelUpGPT(message.author, user.level) /*, ephemeral: true*/ });
	}
});

client.on("messageCreate", async (message) => {
	if (message.content.startsWith(prefix + "rank")) {
		const target = message.mentions.users.first() || message.author; // Grab the target.
		const user = await Levels.fetch(target.id, message.guild.id, true); // Selects the target from the database.

		if (!user) return message.channel.send("Seems like this user has not earned any xp so far."); // If there isnt such user in the database, we send a message in general.
		message.channel.send(`> **${target.tag}** is currently level ${user.level}.\n> ${user.cleanXp} / ${user.cleanNextLevelXp} XP`); // We show the level.

		const rank = new canvacord.Rank() // Build the Rank Card
			.registerFonts([{
				path: './AmaticSC-Regular.ttf', name: 'amogus'
			}])
			.setAvatar(target.displayAvatarURL({ format: 'png', size: 512 }))
			.setCurrentXP(user.cleanXp) // Current User Xp for the current level
			.setRequiredXP(user.cleanNextLevelXp) //The required Xp for the next level
			.setRank(user.position) // Position of the user on the leaderboard
			.setLevel(user.level) // Current Level of the user
			.setProgressBar(["#14C49E", "#FF0000"], "GRADIENT", true)
			.setUsername(target.username)
			.setDiscriminator(target.discriminator);

		rank.build(ops = { fontX: "amogus,NOTO_COLOR_EMOJI", fontY: "amogus,NOTO_COLOR_EMOJI" })
			.then(data => {
				canvacord.write(data, "RankCard.png");
				message.channel.send({
					files: [{
						attachment: './RankCard.png'
					}]
				})
			});
	}
});

client.on("messageCreate", async (message) => {
	if (message.content.startsWith(prefix + "leaderboard")) {
		const rawLeaderboard = await Levels.fetchLeaderboard(message.guild.id, 10); // We grab top 10 users with most xp in the current server.
		if (rawLeaderboard.length < 1) return reply("Nobody's in leaderboard yet.");
		const leaderboard = await Levels.computeLeaderboard(client, rawLeaderboard, true); // We process the leaderboard.
		const lb = leaderboard.map(e => `${e.position}. ${e.username}#${e.discriminator}, Level: ${e.level}, XP: ${e.xp.toLocaleString()}`); // We map the outputs.
		message.channel.send(`**Leaderboard**:\n\n${lb.join("\n")}`);
	}
});

client.on("messageCreate", async (message) => {
	if(message.content.includes("<@1090254079609020447>") ||
		(message.mentions.repliedUser != null && message.mentions.repliedUser.id == "1090254079609020447"))
		message.reply(await martinLutherKing(message.author));
});

client.on("messageCreate", async (message) => {
	if (message.content.startsWith(prefix + "quote") && message.mentions.repliedUser != null) {
		const hey = await message.channel.messages.fetch(message.reference.messageId);
		const c = new renderCanvas();
		c.buildWord(hey.content, hey.attachments.first() != null ? hey.attachments.first().url : null, 
        `- ${hey.author.username}#${hey.author.discriminator}`, hey.author.displayAvatarURL({ format: 'png', size: 512 }))
			.then(data => {
				write(data, "./quote.png");
				message.reply({
					files: [{
						attachment: './quote.png'
					}]
				});
			});
	}
});

class renderCanvas {
    async buildWord(text, attach, user, avatarURL) {
        // create canvas instance
        const canvas = Canvas.createCanvas(600, 300);
        const ctx = canvas.getContext("2d");

        // draw anything
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 600, 300);

        // circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(150, 150, 100, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        // draw avatar
        const avatar = await Canvas.loadImage(avatarURL);
        ctx.drawImage(avatar, 50, 50, 200, 200);
        ctx.restore();

        // behind text
        if (attach != null) {
            var png = await Canvas.loadImage(attach);

            var hRatio = 300 / png.width;
            var vRatio = 300 / png.height;
            var ratio  = Math.min ( hRatio, vRatio );
            ctx.drawImage(png, 0, 0, png.width, png.height, 200, 25, png.width*ratio, png.height*ratio);
        }

        // text anything
        Canvas.GlobalFonts.registerFromPath('./AmaticSC-Regular.ttf', 'amogus');
        ctx.fillStyle = "white";
        // Set the text alignment
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Define the maximum width and height of the text area
        const maxWidth = 200;
        const maxHeight = 200;
        // Define the minimum and maximum font size
        const minFontSize = 10;
        const maxFontSize = 50;
        // Define the font size step
        const fontSizeStep = 1;
        // Set the initial font size
        let fontSize = maxFontSize;
        // Create an array to hold the lines
        var lines = [];
        // Loop through each font size starting from the maximum and decreasing until the text fits within the maximum width and height
        while (fontSize >= minFontSize) {
            // Set the font size
            ctx.font = `bold ${fontSize}px amogus`;
            // Break the text into words
            const words = text.split(' ');
            lines = [];
            // Loop through each word
            let currentLine = words[0];
            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = ctx.measureText(currentLine + ' ' + word).width;
                if (word.includes('\n')) {
                    // If the word contains a newline character, add the current line to the array and start a new line with the remaining text
                    currentLine += ' ' + word.slice(0, word.indexOf('\n'));
                    lines.push(currentLine);
                    currentLine = word.slice(word.indexOf('\n') + 1);
                } else if (width < maxWidth) {
                    currentLine += ' ' + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            // Add the last line
            lines.push(currentLine);
            lines.push(user);
            // Calculate the height of the text
            const lineHeight = fontSize * 1.2;
            const height = lineHeight * lines.length;
            // If the height of the text fits within the maximum height, break out of the loop
            if (height <= maxHeight) {
                break;
            }
            // Otherwise, decrease the font size by the font size step and try again
            fontSize -= fontSizeStep;
        }
        // Calculate the height of the text
        const lineHeight = fontSize * 1.2;
        const height = lineHeight * lines.length;
        // Draw the text
        const x = canvas.width / 2 + 120;
        const y = canvas.height / 2 - height / 2 + 15;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (i == lines.length - 1) ctx.font = '25px amogus';
            ctx.fillText(line, x, y + (i * lineHeight));
        }
        // return everything all at once
        return canvas.encode("png");
    }
}

function write(data, name) {
    return fs.writeFileSync(name, data);
}

function levelUpGPT(name, level) {
	var r = Math.floor(Math.random() * lvl.length);
	return stringTemplateParser(lvl[r], { name: name, level: level });
}
// use this if evil insult bot is down
function insultGPT() {
	var r = Math.floor(Math.random() * roast.length);
	return `${roast[r]}`;
}
async function martinLutherKing(name) {
	try {
		const response = await axios.get("https://evilinsult.com/generate_insult.php?type=json");
		let data = await response.data;
		return `${data.insult}`;
	} catch(error) {
		console.log(":(\n" + error);
		return insultGPT();
	}
}

function stringTemplateParser(expression, valueObj) {
	const templateMatcher = /{{\s?([^{}\s]*)\s?}}/g;
	let text = expression.replace(templateMatcher, (substring, value, index) => {
		value = valueObj[value];
		return value;
	});
	return text;
}

client.login(process.env.TOKEN);
console.log(":)");