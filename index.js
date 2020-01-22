'use strict';

require("dotenv").config();

if (process.env.DiscordToken) {
    const Discord = require('./adapters/discord.js');
    Discord.init();
} else if (process.env.TelegramToken) {
    const Telegram = require('./adapters/telegram.js');
    Telegram.init();
}

if (process.env.NODE_ENV == "production"){
    // Because Azure will otherwise kill my app because it doesn't respond
    var http = require('http');
    var server = http.createServer ( function(request,response){
        response.writeHead(200,{"Content-Type":"text/plain"});
        response.end("I'm alive");
    });

    server.listen(8000);
}