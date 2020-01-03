'use strict';

const GameBoyAdvance = require('gbajs');
const PNG = require('pngjs').PNG;
const fs = require('fs');

class Emulator {
    constructor (data = {}, romPath){
        Object.defineProperty(this, "romPath", {value: romPath});

        this.saveStatePath = "./saves/"

        this.initialize();
    }

    initialize(){
        this.gameboy = new GameBoyAdvance();
        this.gameboy.logLevel = this.gameboy.LOG__ERROR;
        var biosBuf = fs.readFileSync("./node_modules/gbajs/resources/bios.bin");
        this.gameboy.setBios(biosBuf);
        this.gameboy.setCanvasMemory();
        this.gameboy.loadRomFromFile(this.romPath, async(err, result) => {
            if (err) {
                console.error("loadRom failed:", err);
                process.exit(1);
            }
              
            // Loads the default savestate if it exists
            //await this.loadStateAsync();
            this.gameboy.loadSavedataFromFile(`${this.saveStatePath}state_0.sav`);
            this.gameboy.runStable();
        });
    }

    takeScreenshot(){
        var png = this.gameboy.screenshot();
    
        return PNG.sync.write(png);
    }

    processInput(input){
        input = input.toUpperCase();
        if (input.startsWith("SAVE"))
        {
            this.saveStateAsync();
        } else if (input.startsWith("LOAD")){
            this.loadStateAsync();
        } else if (this.gameboy.keypad[input] !== undefined) {
            this.gameboy.keypad.press(this.gameboy.keypad[input]);
        }
    }

    async saveStateAsync(saveStateNum = "0"){
        this.gameboy.downloadSavedataToFile(`${this.saveStatePath}state_${saveStateNum}.sav`, this._saveDataCallback);
    }

    _saveDataCallback = function(err){
        if(err){
            console.log(err);
        } else {
            console.log(`Successfully saved game.`);
        }
    }

    async loadStateAsync(saveStateNum = "0"){
        this.gameboy.loadSavedataFromFile(`${this.saveStatePath}state_${saveStateNum}.sav`, this._loadDataCallback);
    }

    _loadDataCallback = function(err){
        if(err){
            console.log(err);
        } else {
            console.log(`Successfully loaded savefile.`);
        }
    }
};

exports.Emulator = Emulator;