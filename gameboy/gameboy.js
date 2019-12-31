'use strict';

const Serverboy = require('serverboy');
const PNG = require('pngjs').PNG;
const fs = require('fs');

const framerate = 17;       // Try to run the emulator at 60 fps (16.66667 ms per frame)

class Emulator {
    constructor (data = {}, romPath){
        Object.defineProperty(this, "romPath", {value: romPath});

        this.gameboy = new Serverboy();

        this.blockMainThread = false;

        this.start();
    }

    start(){
        var rom = fs.readFileSync(this.romPath);
        
        this.gameboy.loadRom(rom);
    
        this._mainEmulatorLoop();
    }

    _mainEmulatorLoop(){
        setInterval(() => {
            if(!this.blockMainThread){
                this.gameboy.doFrame();
            }
        }, framerate);
    }

    takeScreenshot(){
        var screen = this.gameboy.getScreen();
    
        return this._createPngBuffer(screen);;
    }

    _createPngBuffer(screen){
        var png = new PNG({ width: 160, height: 144 });
        for (let i=0; i<screen.length; i++) {
            png.data[i] = screen[i];
        }
    
        return PNG.sync.write(png);
    }

    processInput(input){
        this.blockMainThread = true;
        for(var holdDown = 0; holdDown < 3; holdDown++){
            this.gameboy.pressKey(input);
            this.gameboy.doFrame();
        }
        this.blockMainThread = false;
    }
};

exports.Emulator = Emulator;