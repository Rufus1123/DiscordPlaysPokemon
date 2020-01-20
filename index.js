'use strict';

const Discord = require('./adapters/discord.js');
//const Telegram = require('./adapters/telegram.js');

Discord.init();
//Telegram.init();

// Because Azure will otherwise kill my app because it doesn't respond
var http = require('http');
var server = http.createServer ( function(request,response){
    response.writeHead(200,{"Content-Type":"text/plain"});
    response.end("I'm alive");
});

server.listen(8000);