'use strict';

require("dotenv").config();
const Discord = require('discord.js');
const Emulator = require('../gameboy/gameboy.js').Emulator;
const PNG = require('pngjs').PNG;
const screenshotComparer = require('../helpers/screenshotComparer');
var emulator = new Emulator("roms/FireRed.gba", process.env.DiscordGuildId);

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
    if (message.author.bot || message.channel.name != getGameboyChannel(message.client).name){
        return;
    }

    var lowercaseMessage = message.content.trim().toLowerCase();

    // Commands should start with a '!'
    if (lowercaseMessage.startsWith('!')){
        lastMesageTimestamp = message.createdTimestamp;
        var command = lowercaseMessage.slice(1);

        processCommand(command, message);
    } else if (lowercaseMessage.match(/^_?((a|b|up|down|left|right|start|select|\.)(\d+m?s)?\s?)+$/g)) {
        // This is a valid command, so process it, without an ! at the start. The flow above is needed 
        // because it can give feedback for errors
        lastMesageTimestamp = message.createdTimestamp;
        
        processCommand(lowercaseMessage, message);
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
            feedback = processLoad(commands);
            break;
        case "save":
            feedback = processSave(commands, message);
            break;
        case "update":
            var screenshot = emulator.takeScreenshot();
            getGameboyChannel(client).send({file: PNG.sync.write(screenshot)});
            return;
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

function processLoad(commands){
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
    let guild = client.guilds.find(g => g.id == process.env.DiscordGuildId);
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
    var embed = new Discord.RichEmbed()
        .setTitle("Discord Plays Help")
        .setDescription("Let's play Pokemon! You can play the game here in Discord by sending commands. Your input needs to " +
                        "start with a `!`.\n\n" +
                        "To reduce bandwidth, only one image every two seconds will be posted. Furthermore, no more " +
                        "images will be posted 10 seconds after the last command was received. Also, if a new image " +
                        "is identical to the previously posted message, it will not be posted. You can explicitly " +
                        "request new image with the `!update`-command.")
        .addField("Controls", "`!A`, `!B`, `!START`, `!SELECT`, and the directional buttons `!UP`, `!DOWN`, `!LEFT`, and `!RIGHT`.")
        .addField("Other Commands", "`!save n`:\n" +
                                    "Save the current savefile in the GameBoys Memory Card to slot `n`.\n" +
                                    "Slots 0, 1 and 2 can be used by everyone. Slots 3, 4 and 5 are reserved for GBAdmins.\n" +
                                    "Note: After saving the game, use `!save n` to create a save state in slot `n`." +
                                    "`!load n`:\n" +
                                    "Load the savefile in slot `n` into the Gameboy. This will reset the Gameboy " +
                                    "and allow you to continue where the game was last saved.\n" +
                                    "`!update`:\n" +
                                    "Sends a new frame, regardless of time since last command.\n" +
                                    "`!help`:\n" +
                                    "Prints this help message.")
        .addField("Advanced Commands", "**Chaining**:\nYou can input multiple instructions at once, e.g. `!a down a`. " +
                                    "Each button will be pressed for 300ms.\n" +
                                    "**Duration**:\nPostfix a duration to hold the button, e.g. `!b500ms` " +
                                    "to hold `B` for 500 milliseconds or `!right2s` to hold `→` for 2 seconds.\n" +
                                    "**Not pressing**:\nA dot `.` in a chained command corresponds to not pressing a button.\n" +
                                    "**Holding buttons**: \nPrefix an underscore `_` to hold a button for the duration of a " +
                                    "chained command, e.g. `!_b up5s` holds the `B` button down while pressing `↑`.");
    return embed;
}