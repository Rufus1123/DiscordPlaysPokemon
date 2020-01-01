
const Discord = require('discord.js');
const PNG = require('pngjs').PNG;
var Gameboy = require('serverboy');
const fs = require('fs');

const client = new Discord.Client();
client.login("token");

var gameboy = new Gameboy();
var rom = fs.readFileSync("rom.gb");
 
gameboy.loadRom(rom);
 
client.on('ready', async () => {
    let guild = client.guilds.find(g => g.name == 'guild');
    if (guild) {
        chatChannel = guild.channels.find(c => c.name == 'channel');
    }

    //Whatever custom logic you need
    var memory = gameboy.getMemory();
    if (memory[3000] === 0) {
        gameboy.pressKeys(["RIGHT"]);
    }

    var frames = 0; var lastFrame = undefined; var currentFrame = undefined;
	var emulatorLoop = function() {
        gameboy.doFrame();
        frames++;
        if(frames%30 === 0) { //Output every 10th frame.
            gameboy.pressKeys(["A"]);
            var screen = gameboy.getScreen();
            //write to PNG (using pngjs)
            var png = new PNG({ width: 160, height: 144 });
            for (let i=0; i<screen.length; i++) {
                png.data[i] = screen[i];
            }

            var buffer = PNG.sync.write(png);

            chatChannel.send({file: buffer});
        }

        setTimeout(emulatorLoop, 30); //Try and run at about 60fps.
    };
    
    emulatorLoop();
}, 0);