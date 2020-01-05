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
        this._loadRomAndSaveFile();
    }

    takeScreenshot(){
        var png = this.gameboy.screenshot();
    
        return PNG.sync.write(png);
    }

    processInput(input){
        input = input.toUpperCase();
        if (this.gameboy.keypad[input] !== undefined) {
            this.gameboy.keypad.press(this.gameboy.keypad[input]);
        }
    }

    writeSaveFile(slot = "0"){
        this.gameboy.downloadSavedataToFile(`${this.saveStatePath}save_${slot}.sav`, this._saveDataCallback);
    }

    _saveDataCallback = function(err){
        if(err){
            console.log(err);
        } else {
            console.log(`Successfully saved game.`);
        }
    }

    readSaveFile(slot = "0"){
        this.gameboy.loadSavedataFromFile(`${this.saveStatePath}save_${slot}.sav`, this._loadDataCallback);
    }

    readSaveFileAndReset(slot){
        this._loadRomAndSaveFile(slot);
    }

    _loadDataCallback = function(err){
        if(err){
            console.log(err);
        } else {
            console.log(`Successfully loaded savefile.`);
        }
    }

    _loadRomAndSaveFile(slot = "0") {
        this.gameboy.loadRomFromFile(this.romPath, (err, result) => {
            if (err) {
                console.error("loadRom failed:", err);
                process.exit(1);
            }
            // Loads the default savestate if it exists
            this.readSaveFile(slot);
            this.gameboy.runStable();
        });
    }
};

exports.Emulator = Emulator;