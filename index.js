// Discord Bot by GDjkhp
// Features: xp system, insult generator, make it a quote, chatgpt, dall-e, morbsweeper
// Reach out GDjkhp#3732 on Discord for support

require('dotenv').config();
const {Client, Events, GatewayIntentBits, EmbedBuilder, MessageMentions} = require('discord.js');
const client = new Client({ 
    allowedMentions: { parse: [], repliedUser: true },
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildMessages, 
		GatewayIntentBits.MessageContent
	] 
});
const config = require('./config.json');
const prefix = config.prefix;
const fs = require("fs");
const Canvas = require("@napi-rs/canvas");
const lvl = require('./messages.json');
const roast = require('./insults.json');
const requestHandler = require('axios').default;
const axios = requestHandler.create({
    timeout: 2000,
});

// prefixes
const quote = "quote", ask = "ask", imagine = "imagine", rank1 = "rank", leaderboard1 = "leaderboard", gpt = "gpt";

// replit
const isUsingReplit = true;
if (isUsingReplit) {
    var http = require('http');
    http.createServer(function(req, res) {
        res.write("Bot by GDjkhp"); res.end();
    }).listen(8080);

    console.log(new Date());
}

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
    client.user.setStatus("dnd");
});

// open ai shit
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_TOKEN,
});
const openai = new OpenAIApi(configuration);

// TEXT GENERATION (GPT-3.5-Turbo)
client.on("messageCreate", async (message) => {
    if(message.content.startsWith(prefix + ask)) {
        await getResponse(message);
    }
});

async function getResponse(message) {
    const messagesArray = await loopMsgs(message);
    const info = message.reply({content: `Generating response…`});
    const old = new Date();
    let completion;
    try {
        completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messagesArray,
        });
    } catch (error) {
        if (error.response.data.error.message == "You exceeded your current quota, please check your plan and billing details.")
            return (await info).edit(`${error.response.data.error.message}\n\n${await martinLutherKing()}`);
        
        if (error.response && error.response.status === 429) {
            // Retry the request after a delay
            (await info).edit(`Your are being rate limited! Retrying in 60 seconds, please wait!\n\n${await martinLutherKing()}`);
            await wait(60 * 1000);
            // Retry the request
            return await getResponse(message);
        }
        // Handle other errors
        return (await info).edit(`Error ${error.response.status}: ${error.response.data.error.message}\n\n${await martinLutherKing()}`);
    }
    if (completion.data.choices[0].message.content.length > 2000) {
        let index = 0;
        while (index < completion.data.choices[0].message.content.length) {
            if (index == 0) {
                message.reply({
                    content: `${completion.data.choices[0].message.content.substring(0, 2000)}`, 
                    allowedMentions: { parse: [] }
                });
            }
            else {
                message.channel.send({
                    content: `${completion.data.choices[0].message.content.substring(index, index+2000)}`, 
                    allowedMentions: { parse: [] }
                });
            }
            index+=2000;
        }
    } 
    else message.reply({content: completion.data.choices[0].message.content});
    (await info).edit(`Took ${new Date() - old}ms`);
}

async function loopMsgs(message) {
    const role = message.author.bot ? "assistant" : "user";
    const content = message.content.replace(`${prefix + ask} `, '');
    if (!message.mentions.repliedUser) {
        return [{ role: role, content: content }];
    }
    
    const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
    const previousMessages = await loopMsgs(repliedMessage);
    
    return [...previousMessages, { role: role, content: content }];
}

// TEXT GENERATION (GPT-3)
client.on("messageCreate", async (message) => {
	if(message.content.startsWith(prefix + gpt)) {
        await getResponse0(message);
    }
});

async function getResponse0(message) {
    const info = message.reply({content: `Generating response…`});
    const old = new Date();
    let completion;
    try {
        completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: message.content.replace(`${prefix + gpt} `, ''),
            max_tokens: 2000,
        });
    } catch (error) {
        if (error.response.data.error.message == "You exceeded your current quota, please check your plan and billing details.")
            return (await info).edit(`${error.response.data.error.message}\n\n${await martinLutherKing()}`);
        
        if (error.response && error.response.status === 429) {
            // Retry the request after a delay
            (await info).edit(`Your are being rate limited! Retrying in 60 seconds, please wait!\n\n${await martinLutherKing()}`);
            await wait(60 * 1000);
            // Retry the request
            return await getResponse0(message);
        }
        // Handle other errors
        return (await info).edit(`Error ${error.response.status}: ${error.response.data.error.message}\n\n${await martinLutherKing()}`);
    }
    if (completion.data.choices[0].text.length > 2000) {
        let index = 0;
        while (index < completion.data.choices[0].text.length) {
            if (index == 0) {
                message.reply({
                    content: `${completion.data.choices[0].text.substring(0, 2000)}`, 
                    allowedMentions: { parse: [] }
                });
            }
            else {
                message.channel.send({
                    content: `${completion.data.choices[0].text.substring(index, index+2000)}`, 
                    allowedMentions: { parse: [] }
                });
            }
            index+=2000;
        }
    }
    else message.reply({content: `${completion.data.choices[0].text}`});
    (await info).edit(`Took ${new Date() - old}ms`);
}

// IMAGE GENERATION (DALL-E)
client.on("messageCreate", async (message) => {
	if(message.content.startsWith(prefix + imagine)) {
        await getImage(message);
    }
});

async function getImage(message) {
    let promptMsg = message.content.replace(`${prefix + imagine} `, '');
    if (message.mentions.repliedUser) {
        const hey = await message.channel.messages.fetch(message.reference.messageId);
        promptMsg = `${promptMsg}: ${hey.content}`.replace(`${prefix + imagine} `, '');
    }
    const info = message.reply({content: `Generating image…`});
    const old = new Date();
    let response;
    try {
        response = await openai.createImage({
            prompt: promptMsg,
        });
    } catch (error) {
        if (error.response.data.error.message == "Billing hard limit has been reached")
            return (await info).edit(`Error ${error.response.status}: ${error.response.data.error.message}.\n\n${await martinLutherKing()}`);
    
        if (error.response && error.response.status === 429) {
            // Retry the request after a delay
            (await info).edit(`Your are being rate limited! Retrying in 60 seconds, please wait!\n\n${await martinLutherKing()}`);
            await wait(60 * 1000);
            // Retry the request
            return await getImage(message);
        }
        // Handle other errors
        return (await info).edit(`Error ${error.response.status}: ${error.response.data.error.message}\n\n${await martinLutherKing()}`);
    }
    message.reply({files: [{attachment: response.data.data[0].url, name: `${promptMsg}.png`}]});
    (await info).edit(`Took ${new Date() - old}ms`);
}

// XP SYSTEM
var xpSystem = false; // TODO: ItzCata said it's annoying. Create DB of ServerIDs and let the people decide. Check discord-xp (index.js)
const Levels = require('discord-xp');
Levels.setURL(process.env.DB);
const canvacord = require('canvacord');
// XP RNG
client.on("messageCreate", async (message) => {
    if (!xpSystem) return;
    if (!message.guild) return;
    if (message.author.bot) return;

    const randomAmountOfXp = Math.floor(Math.random() * 29) + 1; // Min 1, Max 30
    const hasLeveledUp = await Levels.appendXp(message.author.id, message.guild.id, randomAmountOfXp);
    if (hasLeveledUp) {
        const user = await Levels.fetch(message.author.id, message.guild.id);
        message.channel.send({ content: levelUpGPT(message.author, user.level) /*, ephemeral: true*/ });
    }
});
// RANK
client.on("messageCreate", async (message) => {
    if (!xpSystem) return;
    if (message.content.startsWith(prefix + rank1)) {
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
// LEADERBOARD
client.on("messageCreate", async (message) => {
    if (!xpSystem) return;
    if (message.content.startsWith(prefix + leaderboard1)) {
        const rawLeaderboard = await Levels.fetchLeaderboard(message.guild.id, 10); // We grab top 10 users with most xp in the current server.
        if (rawLeaderboard.length < 1) return reply("Nobody's in leaderboard yet.");
        const leaderboard = await Levels.computeLeaderboard(client, rawLeaderboard, true); // We process the leaderboard.
        const lb = leaderboard.map(e => `${e.position}. ${e.username}#${e.discriminator}, Level: ${e.level}, XP: ${e.xp.toLocaleString()}`); // We map the outputs.
        message.channel.send(`**Leaderboard**:\n\n${lb.join("\n")}`);
    }
});

// INSULTS
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if(message.content.includes("<@1090254079609020447>") ||
        (message.mentions.repliedUser && message.mentions.repliedUser.id == "1090254079609020447"))
        message.reply(await martinLutherKing());
});
// MAKE IT A QUOTE
client.on("messageCreate", async (message) => {
    if (message.content.startsWith(prefix + quote) && message.mentions.repliedUser) {
        const hey = await message.channel.messages.fetch(message.reference.messageId); // TODO: mentions return <@id>
        const c = new renderCanvas();
        // Check if the message has mentions
        let contentWithUsernames;
        if (hey.mentions) {
            const mentions = hey.mentions;
            // Replace <@id> mentions with the corresponding usernames
            contentWithUsernames = hey.content.replace(
                MessageMentions.UsersPattern,
                (match, userId) => {
                    const user = mentions.users.get(userId);
                    return user ? `@${user.username}` : match;
                }
            );
        }
        c.buildWord(message.mentions ? contentWithUsernames : hey.content, hey.attachments.first() ? hey.attachments.first().url : null, 
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
// canvas for quote
class renderCanvas {
    async buildWord(text, attach, user, avatarURL) {
        // create canvas instance
        const canvas = Canvas.createCanvas(600, 300);
        const ctx = canvas.getContext("2d");

        // draw anything
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 600, 300);

        // behind text
        try {
            if (attach) {
                var png = await Canvas.loadImage(attach);
    
                var hRatio = 300 / png.width;
                var vRatio = 300 / png.height;
                var ratio  = Math.min ( hRatio, vRatio );
                ctx.drawImage(png, 0, 0, png.width, png.height, 200, 25, png.width*ratio, png.height*ratio);
            }
        } catch (error) {
            console.log(error);
        }

        // circle
        // ctx.save();
        // ctx.beginPath();
        // ctx.arc(150, 150, 100, 0, Math.PI * 2, true);
        // ctx.closePath();
        // ctx.clip();
        
        // draw avatar
        const avatar = await Canvas.loadImage(avatarURL);
        ctx.drawImage(avatar, 50, 50, 200, 200);
        // ctx.restore();

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
            ctx.font = `bold ${fontSize}px amogus, NOTO_COLOR_EMOJI`;
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
            if (i == lines.length - 1) ctx.font = '25px amogus, NOTO_COLOR_EMOJI';
            ctx.fillText(line, x, y + (i * lineHeight));
        }
        // return everything all at once
        return canvas.encode("png");
    }
}
// it needs to be saved as png
function write(data, name) {
    return fs.writeFileSync(name, data);
}
// level up messages
function levelUpGPT(name, level) {
	var r = Math.floor(Math.random() * lvl.length);
	return stringTemplateParser(lvl[r], { name: name, level: level });
}
// use this if evil insult bot is down
function insultGPT() {
	var r = Math.floor(Math.random() * roast.length);
	return `${roast[r]}`;
}
// evil insult bot
let useEvilInsult = false;
async function martinLutherKing() {
    if (!useEvilInsult) return insultGPT();
	try {
		const response = await axios.get("https://evilinsult.com/generate_insult.php?type=json");
		let data = await response.data;
		return `${data.insult}`;
	} catch(error) {
		console.log(":(\n" + error);
		return insultGPT();
	}
}
// Utility function to wait for a specific time
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// ???
function stringTemplateParser(expression, valueObj) {
	const templateMatcher = /{{\s?([^{}\s]*)\s?}}/g;
	let text = expression.replace(templateMatcher, (substring, value, index) => {
		value = valueObj[value];
		return value;
	});
	return text;
}

// Welcome to the Minesweeper Bot source code!
// What you're probably looking for is the generateGame.js file, which contains the actually minesweeper-related code.
// The code in this file manages the bot's connection and interprets commands.

const log = require("./sweep/log.js");

/** ───── BECOME A DISCORD BOT ───── **/
// This section is to load the modules, initialise the bot and create some general functions.

// Load everything
const settings = require("./sweep/settings.json");
const commands = require("./sweep/commands.js");
const AutoChannel = require("./sweep/AutoChannel.js");

log("All modules loaded");

function getGuildCount() {
	return client.guilds.cache.size;
};

// setup for hourly reports in the log
var messagesThisHour = 0;
var commandsThisHour = 0;
var reconnectsThisHour = 0;
function report() {
	log(`Hourly report: ${messagesThisHour} messages, ${commandsThisHour} commands, ${reconnectsThisHour} reconnects.`);
	messagesThisHour = 0;
	commandsThisHour = 0;
	reconnectsThisHour = 0;
	setTimeout(report, getTimeUntilNextHour());
};
function getTimeUntilNextHour() {
	let now = new Date();
	return (59 - now.getMinutes())*60000 + (60 - now.getSeconds())*1000;
};

setTimeout(report, getTimeUntilNextHour());

// Misc event handlers

client.on("ready", () => {
	log(`Ready! Current guild count: ${getGuildCount()}`);

	AutoChannel.loadAndStartAll(client).catch(err => {
		log("WARNING: FAILED TO LOAD AUTOCHANNELS");
		log(err);
	})
});

client.on("disconnected", event => {
	log("WebSocket disconnected! CloseEvent:");
	console.log(event);
});

client.on("reconnecting", () => {
	reconnectsThisHour++;
});

client.on("ratelimit", info => {
	log("Being ratelimited! Info:");
	console.log(info);
});

client.on("error", () => {
	log("WebSocket error");
});

client.on("warn", warning => {
	log(`Emitted warning: ${warning}`);
});

/*
client.on("debug", info => {
	log(`Emitted debug: ${info});
]);
//*/

client.on("guildCreate", guild => {
	log(`Joined a new guild! It's called "${guild.name}" (Current count: ${getGuildCount()})`);
});

client.on("guildDelete", guild => {
	log(`Left a guild :(. It was called "${guild.name}" (Current count: ${getGuildCount()})`);
});

/** ───── COMMAND PARSER ───── **/
// This section is to evaluate your commands and reply to your commands.

client.on('messageCreate', message => {
	if (message.author.bot) {
		return;
	}

	messagesThisHour++;

	if (message.guild) {
		if (!message.guild.available) {
			return;
		}
	}
	
	// Commands
	if (message.content.startsWith(settings.prefix)) {
		respondToCommand(message, message.content.substring(settings.prefix.length).trim());
	}
});

client.on('interactionCreate', interaction => {
	if (interaction.isCommand()) {
		respondToCommand(interaction, interaction.commandName, interaction.options);
	}
});

/**
 * Executes a command and responds.
 * @param {Discord.Message|Discord.CommandInteraction} source The Discord message or slash command interaction that triggered this command.
 * @param {string} command The command to execute. For text commands, this is the whole command; for interactions it is only the command name and 'options' contains the rest.
 * @param {Discord.CommandInteractionOptionResolver} [options] For slash commands, the options specified.
 * @returns {Promise<void>}
 */
async function respondToCommand(source, command, options) {
	let result = executeCommand(source, command, options);
	if (!result) {
		return;
	}
	if (result instanceof Promise) {
		result = await result;
	}
	commandsThisHour++;

	// Multiple messages: the first one is a reply, the rest is regular messages.
	if (Array.isArray(result)) {
		if (result.length == 0) {
			return;
		}
		// Check if the regular messages can be sent
		if (result.length > 1 && source.guild) {
			source.reply("The response exceeds Discord's character limit.").catch(log);
			return;
		}
		try {
			await source.reply(convertMessage(result[0]));
			for (var i = 1; i < result.length; i++) {
				await source.channel.send(convertMessage(result[i]));
			}
		}
		catch (err) {
			log(err);
		}
	}
	else {
		source.reply(convertMessage(result)).catch(log);
	}

	/**
	 * Modifies a message to make it ready for sending.
	 * @param {string|Discord.MessageOptions} message The message to convert.
	 * @returns {Discord.MessageOptions} The modified message.
	 */
	function convertMessage(message) {
		if (typeof message == "string") {
			message = { content: message };
		}
		message.allowedMentions = { repliedUser: false };
		return message;
	}
}

/**
 * Executes a command.
 * @param {Discord.Message|Discord.CommandInteraction} source The Discord message or slash command interaction that triggered this command.
 * @param {string} command The command to execute.
 * @param {Discord.CommandInteractionOptionResolver} [options] For slash commands, the options specified.
 * @returns {string|Discord.MessageOptions|Array<string|Discord.MessageOptions>|Promise<string>|Promise<Discord.MessageOptions>|Promise<Array<string|Discord.MessageOptions>>} The message to reply with.
 */
function executeCommand(source, command, options) {
	try {
		//log("Executing command: "+command);

		// The last function that gets encountered will be executed.
		let runFunction = commands.run;

		// Find the command that was run
		let argument;
		for (var a = 0; a < commands.options.length; a++) {
			let checkResult = commands.options[a].checkInput(command);
			if (!checkResult.error) {
				argument = commands.options[a];
				if (argument.run) {
					runFunction = argument.run;
				}
				command = command.substring(checkResult.inputEnd).trim();
				break;
			}
		}
		if (!argument) {
			return;
		}

		// Check permissions
		if (argument.default_member_permissions) {
			if (!source.guild) {
				return { content: "This command can only be used in a server.", ephemeral: true };
			}
			if (!source.member.permissions.has(argument.default_member_permissions)) {
				return { content: "You do not have permsision to use this command.", ephemeral: true };
			}
		}

		// Get the options
		let inputs = [];
		if (argument.options) {
			for (var i = 0; i < argument.options.length; i++) {

				// Slash commands
				if (options) {
					let option = options.get(argument.options[i].name);

					if (option) {
						inputs[i] = option.value;
					}
					// I know that Discord will disallow this for me, but it doesn't hurt to check.
					else if (argument.options[i].required) {
						return { content: `You're missing a required argument: \`${argument.getOptionsSyntax(i, true)}\`.`, ephemeral: true };
					}
				}
				// Text commands
				else {
					// No more input?
					if (command == "") {
						if (argument.options[i].required) {
							return { content: `You're missing one or more required arguments: \`${argument.getOptionsSyntax(i, true)}\`.`, ephemeral: true };
						}
						break;
					}

					// Check input
					let checkResult = argument.options[i].checkInput(command);
					if (checkResult.error) {
						return { content: `${checkResult.error}: \`${checkResult.input}\` (at \`${argument.getOptionsSyntax(i, true)}\`).`, ephemeral: true };
					}

					inputs[i] = checkResult.input;
				
					if (checkResult.inputEnd < 0) {
						command = "";
					}
					else {
						command = command.substring(checkResult.inputEnd).trim();
					}
				}

				if (argument.options[i].run) {
					runFunction = argument.options[i].run;
				}
			}
		}

		if (!runFunction) {
			log("WARNING: no command execution method found.");
			return { content: "It looks like this command has not been implemented yet. Please contact my owner if you think this is an error.", ephemeral: true };
		}
		
		// Run the command
		return runFunction(source, inputs, client);
	}
	catch (err) {
		log(err);
		return { content: "An unknown error occurred while evaluating your command.", ephemeral: true };
	}
};

// main function
client.login(process.env.TOKEN);
console.log(":)");