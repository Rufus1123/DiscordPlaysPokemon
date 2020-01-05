'use strict';

require("dotenv").config();
const Discord = require('discord.js');
const Emulator = require('../gameboy/gameboy.js').Emulator;
var emulator = new Emulator(null, "roms/FireRed.gba");

var client = new Discord.Client();
var lastMesageTimestamp = new Date().getTime();

exports.init = function (){
    client.login(process.env.TOKEN);

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
    
    switch(commands[0]){
        case "help":
            sendHelpMessage(message);
            break;
        case "load":
            processLoad(commands, message);
            break;
        case "save":
            processSave(commands, message);
            break;
        default:
            emulator.processInput(command);
            break;
    }
}

function processLoad(commands, message){
    let state = Number(commands[1]);
    if (state >= 0 && state < 6){
        emulator.readSaveFileAndReset(state);
    } else {
        message.channel.send("Specify a slot to load to, i.e. `!load 0` to load in slot 0");
    }
}

function processSave(commands, message){
    let slot = Number(commands[1]);
    if (slot >= 3 && slot < 6){
        let permitted = hasPermission(message.member);
        if (permitted){
            emulator.writeSaveFile(slot);
            message.channel.send("Game has been saved into slot " + slot);
        } else {
            // You are not permitted to load {state}
            message.channel.send("You are not allowed to save in slot " + slot);
        }
    } else if (slot >=0 && slot < 3){
        emulator.writeSaveFile(slot);
        message.channel.send("Game has been saved into slot " + slot);
    } else {
        message.channel.send("Specify a slot to save to, i.e. `!save 0` to save in slot 0");
    }
}

function hasPermission(member){
    return member.roles.find(r => r.name === "GBAdmin") != undefined;
}

function getGameboyChannel(client){
    let guild = client.guilds.find(g => g.name == 'Mystic Delft');
    if (guild) {
        return guild.channels.find(c => c.name == 'chat');
    }
}

function postScreenshot(){
    var channel = getGameboyChannel(client);
    var screen = emulator.takeScreenshot();
    sendScreenshot(channel, screen);
}

async function sendScreenshot(channel, file){
    await channel.send({file: file});
}

async function sendHelpMessage(message){
    var helpText = "Start your input with a `!`. The emulator reacts to " +
                   "`up`, `down`, `left`, `right`, `a`, `b`, `start` and `select`.\n" +
                   "You can also input multiple instructions at once, e.g. `!a down a`." +
                   "Advanced commands: postfix a duration to hold the button, e.g. `!b500ms` " +
                   "to hold `b` for 500 milliseconds or `!right2s` to hold `→` for 2 seconds`.\n" +
                   "Note: After saving the game, use `!save n` to create a save state in slot n. " +
                   "Slots 0, 1 and 2 can be used by everyone. Slots 4, 5 and 6 are reserved " +
                   "for moderators.";
    var embed = new Discord.RichEmbed()
        .setTitle("Discord Plays Help")
        .setDescription(helpText);
    await message.channel.send(embed);
}