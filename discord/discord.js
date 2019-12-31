'use strict';

require("dotenv").config();
const Discord = require('discord.js');
const Emulator = require('../gameboy/gameboy.js').Emulator;
var emulator = new Emulator(null, "roms/Yellow.gbc");

var client = new Discord.Client();

exports.init = function (){
    client.login(process.env.TOKEN);

    client.on('ready', () => onClientReady());
    client.on('message', (message) => onMessageReceived(message));
}

var onClientReady = () => {
    console.log("Client ready");
    console.log("Starting main loop");

    var channel = getGameboyChannel(client);
        
    setInterval(() => postScreenshot(client), 2000);
};

var onMessageReceived = (message) => {
    if (message.author.bot){
        return;
    }

    // Commands should start with a '!'
    if (message.content.startsWith('!')){
        var command = message.content.slice(1).trim();

        if(command === "help"){
            sendHelpMessage(message);

            return;
        } 

        emulator.processInput(command);
        //setTimeout(postScreenshot, 2000);
    }
};

function getGameboyChannel(client){
    let guild = client.guilds.find(g => g.name == 'DiscordPlaysPokemon');
    if (guild) {
        return guild.channels.find(c => c.name == 'general');
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
    await message.channel.send("Start your input with a `!`. The emulator reacts to `up`, `down`, `left`, `right`, `a`, `b`, `start` and `select`.");
}