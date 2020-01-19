'use strict';

require("dotenv").config();
const Discord = require('discord.js');
const Emulator = require('../gameboy/gameboy.js').Emulator;
const PNG = require('pngjs').PNG;
const screenshotComparer = require('../helpers/screenshotComparer');
var emulator = new Emulator("roms/FireRed.gba");

var client = new Discord.Client();

var lastMesageTimestamp = new Date().getTime();
var onlySendScreenshotWhenDifferent = true;

exports.init = function (){
    client.login(process.env.DiscordToken);

    client.on('ready', () => onClientReady());
    client.on('message', (message) => onMessageReceived(message));
}

var onClientReady = () => {
    console.log("Client ready");
    console.log("Starting main loop");

        
    setInterval(() => {
        if (new Date().getTime() - lastMesageTimestamp < 30000){
            postScreenshot(client)
        }
    }, 2000);
};

var onMessageReceived = (message) => {
    if (message.author.bot){
        return;
    }

    // Commands should start with a '!'
    if (message.content.startsWith('!')){
        lastMesageTimestamp = message.createdTimestamp;
        var command = message.content.slice(1).trim().toLowerCase();

        processCommand(command, message);
    }
};

function processCommand(command, message){
    var commands = command.split(" ");
    let feedback;

    switch(commands[0]){
        case "help":
            feedback = sendHelpMessage(message);
            break;
        case "load":
            feedback = processLoad(commands, message);
            break;
        case "save":
            feedback = processSave(commands, message);
            break;
        default:
            feedback = emulator.processInput(command);
            break;
    }

    sendMessage(feedback, message);
}

function sendMessage(feedback, message) {
    if (feedback) {
        message.channel.send(feedback);
    }
}

function processLoad(commands, message){
    let state = Number(commands[1]);
    if (state >= 0 && state < 6){
        emulator.readSaveFileAndReset(state);
    } else {
        return "Specify a slot to load to, i.e. `!load 0` to load in slot 0.";
    }
}

function processSave(commands, message){
    let slot = Number(commands[1]);
    if (slot >= 3 && slot < 6){
        let permitted = hasPermission(message.member);
        if (permitted){
            emulator.writeSaveFile(slot);
            return `Game has been saved into slot ${slot}.`;
        } else {
            // You are not permitted to load {state}
            return  `You are not allowed to save in slot ${slot}.`;
        }
    } else if (slot >=0 && slot < 3){
        emulator.writeSaveFile(slot);
        return `Game has been saved into slot ${slot}.`;
    } else {
        return "Specify a slot to save to, i.e. `!save 0` to save in slot 0.";
    }
}

function hasPermission(member){
    return member.roles.find(r => r.name === "GBAdmin") != undefined;
}

function getGameboyChannel(client){
    let guild = client.guilds.find(g => g.name == process.env.DiscordGuild);
    if (guild) {
        return guild.channels.find(c => c.name == process.env.DiscordChannel);
    }
}

function postScreenshot(){
    var channel = getGameboyChannel(client);
    var screen = emulator.takeScreenshot();
    sendScreenshot(channel, screen);
}

async function sendScreenshot(channel, file){
    if (onlySendScreenshotWhenDifferent) {
        var areDifferent = await screenshotComparer.isDifferentFromPosted(file)
        if (areDifferent == true) {
            await channel.send({file: PNG.sync.write(file)});
        }
    } else {
        await channel.send({file: PNG.sync.write(file)});
    }
}

function sendHelpMessage(){
    var helpText = "Start your input with a `!`. The emulator reacts to " +
                   "`up`, `down`, `left`, `right`, `a`, `b`, `start` and `select`.\n" +
                   "Chaining commands: you can input multiple instructions at once, e.g. `!a down a`." +
                   "Each button will be pressed for 300ms. A dot `.` corresponds to not pressing a button\n" +
                   "Holding buttons: prefix an underscore `_` to hold a button for the duration of a chained" +
                   "input, e.g. `!_b up5s` holds the `B` button down while pressing `↑`.\n" +
                   "Advanced commands: postfix a duration to hold the button, e.g. `!b500ms` " +
                   "to hold `B` for 500 milliseconds or `!right2s` to hold `→` for 2 seconds.\n" +
                   "Saving and Loading: `!save n` will save the current save on the Gameboys Memory Card to " +
                   "slot `n`. `!load n` will load the save into the Gameboys Memory Card and restart the " +
                   "Game so you can load the specified save file. Slots 0, 1 and 2 can be used by everyone. " +
                   "Slots 3, 4 and 5 are reserved for moderators.\n" +
                   "Note: After saving the game, use `!save n` to create a save state in slot `n`."
    var embed = new Discord.RichEmbed()
        .setTitle("Discord Plays Help")
        .setDescription(helpText);
    return embed;
}