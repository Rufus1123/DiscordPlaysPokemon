'use strict';

const GameBoyAdvance = require('gbajs');
const Dropbox = require('../dropbox/dropbox');
const PNG = require('pngjs').PNG;
const fs = require('fs');
const util = require('../helpers/util');

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
        let buttonPresses = [];

        try{
            buttonPresses = this.parseInput(input);
        } catch (error) {
            return error.message;
        }

        this.pressAndHoldButtons(buttonPresses);
    }

    parseInput(input){
        var inputArr = input.split(" ");
        var buttonPresses = [];

        for (var i=0; i<inputArr.length; i++){
            let buttonPress = ButtonPress.parseCommand(inputArr[i]);

            buttonPresses.push(buttonPress);
        }

        buttonPresses = this.updateDurationHoldButtons(buttonPresses);
        this.verifyCommandLimits(buttonPresses);

        return buttonPresses;
    }

    updateDurationHoldButtons(buttonPresses){
        for (var i=0; i<buttonPresses.length; i++){
            if (buttonPresses[i].hold){
                var holdDuration = buttonPresses.slice(i+1).reduce((prev, curr) => prev + curr.duration, 0);
                buttonPresses[i].duration = holdDuration;
                if (holdDuration < 100) {
                    throw new Error(`Cannot hold button ${buttonPresses[i].button} for ${buttonPresses[i].holdDuration}ms`);
                }
            }
        }
        return buttonPresses;
    }

    verifyCommandLimits(commands){
        var totalLength = commands.reduce((prev, curr) => prev + curr.duration, 0);

        if (totalLength < 100){
            throw new Error(`Duration of ${totalLength}ms is too short. Please specify a command with a total duration of more than 100ms.`);
        }
        if (totalLength > 10000){
            throw new Error(`Duration of ${totalLength}ms is too long. Please specify a command with a total duration of less than 10s.`);
        }
    }

    async pressAndHoldButtons(buttonPresses){
        for(var i=0; i < buttonPresses.length; i++){
            if (buttonPresses[i].hold){
                this.pressAndHoldButton(buttonPresses[i]);
            } else {
                await this.pressAndHoldButton(buttonPresses[i]);
            }
        }
    }

    async pressAndHoldButton(buttonPress){
        if (buttonPress.button === "."){
            // idle; don't press any button
            await util.sleep(buttonPress.duration);
        } else {
            let button = this.gameboy.keypad[buttonPress.button];
            this.gameboy.keypad.keydown(button);
            await util.sleep(buttonPress.duration);
            this.gameboy.keypad.keyup(button);
        }
    }

    writeSaveFile(slot = "0"){
        return new Promise((resolve, reject) => {
            var saveFile = `save_${slot}.sav`;
            this.gameboy.downloadSavedataToFile(this.saveStatePath + saveFile, async (err)=>{
                if(err){
                    console.log(err);

                    return reject(err);
                } else {
                    console.log(`Successfully saved game to file.`);
                }

                try {
                    await Dropbox.uploadFile(fs.readFileSync(this.saveStatePath + saveFile), saveFile);
                } catch(err) {
                    return reject(err);
                }

                console.log("Succesfully saved " + saveFile + " to dropbox.");
                resolve(saveFile);
            });
        });
    }

    _readSaveFile(slot = "0"){
        return new Promise(async (resolve, reject) => {
            var saveFile = `save_${slot}.sav`;

            try {
                var content = await Dropbox.downloadFile(saveFile);
                fs.writeFileSync(this.saveStatePath + saveFile, content);
            } catch(err) {
                return reject(err);
            }

            this.gameboy.loadSavedataFromFile(this.saveStatePath + saveFile, (err) => {
                if(err){
                    console.log(err);

                    reject(err);
                } else {
                    console.log(`Successfully loaded savefile.`);
                    resolve(saveFile);
                }
            });
        });
    }

    readSaveFileAndReset(slot){
        this._loadRomAndSaveFile(slot);
    }

    _loadDataCallback

    _loadRomAndSaveFile(slot = "0") {
        this.gameboy.loadRomFromFile(this.romPath, (err, result) => {
            if (err) {
                console.error("loadRom failed:", err);
                process.exit(1);
            }
            // Loads the default savestate if it exists
            this._readSaveFile(slot);
            this.gameboy.runStable();
        });
    }
};

class ButtonPress {
    static parseCommand(input){
        var duration = input.match(/\d+M?S$/g);
        duration = (duration === null) ? "300MS" : duration[0];
        let durationInMilliseconds = this._parseDuration(duration);

        var button = input.match(/^_?(A|B|UP|DOWN|LEFT|RIGHT|START|SELECT|.)?/g)[0];

        try{
            if (button && input.replace(button, "").replace(duration, "") === ""){
                let hold = false;
                if (button.startsWith("_")){
                    button = button.slice(1);
                    hold = true;
                }
                var buttonPress = {
                    button: button,
                    duration: durationInMilliseconds,
                    hold: hold
                };

                this._verifyDurationLimits(buttonPress);

                return buttonPress;
            } else {
                throw new Error(`Button not recognized.`);
            }
        } catch (error){
            throw new Error(`There was an error processing your command at ${input}. ${error.message}`);
        }
    }

    static _verifyDurationLimits(buttonPress){
        if (buttonPress.duration < 100){
            throw new Error(`Duration of ${buttonPress.duration}ms is too short. Please specify a duration of more than 100ms.`);
        }
        if (buttonPress.duration > 10000){
            throw new Error(`Duration of ${buttonPress.duration}ms is too long. Please specify a duration of less than 10s.`);
        }
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