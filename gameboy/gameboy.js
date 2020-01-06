'use strict';

const GameBoyAdvance = require('gbajs');
const PNG = require('pngjs').PNG;
const fs = require('fs');

class Emulator {
    constructor (romPath){
        Object.defineProperty(this, "romPath", {value: romPath});

        this.saveStatePath = "./saves/";

        this.ButtonPresses = [];

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
        var buttonPress = ButtonPress.parseCommand(input);
        if (buttonPress === undefined) {
            return `There was an error processing your command at ${input}. Button not recognized.`;
        }
        
        var errorMessage = ButtonPress.verifyDurationLimits(buttonPress);
        if (errorMessage) {
            return `There was an error processing your command at ${input}. ${errorMessage}`;
        }

        if (this.gameboy.keypad[buttonPress.button] !== undefined) {
            this.gameboy.keypad.press(this.gameboy.keypad[buttonPress.button], buttonPress.duration);
        }

        return;
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

class ButtonPress {
    static parseCommand(input){
        var duration = input.match(/\d+M?S$/g);
        duration = (duration === null) ? "300MS" : duration[0];
        let durationInMilliseconds = this._parseDuration(duration);
        var button = input.match(/^(A|B|UP|DOWN|LEFT|RIGHT|START|SELECT)?/g)[0];
        if (button && input.replace(button, "").replace(duration, "") === ""){
            return {
                button: button,
                duration: durationInMilliseconds
            };
        }

        return;
    }

    static verifyDurationLimits(buttonPress){
        if (buttonPress.duration < 100){
            return `Duration of ${buttonPress.duration} is too short. Please specify a duration of more than 100ms.`;
        }
        if (buttonPress.duration > 10000){
            return `Duration of ${buttonPress.duration} is too long. Please specify a duration of less than 10s.`;
        }

        return;
    }

    static _parseDuration(string){
        let durationInMilliseconds;
        if (string.includes("M")){
            durationInMilliseconds = Number(string.slice(0, -2));
        } else {
            durationInMilliseconds = Number(string.slice(0, -1));
            durationInMilliseconds *= 1000;
        }

        return durationInMilliseconds;
    }
}

exports.Emulator = Emulator;