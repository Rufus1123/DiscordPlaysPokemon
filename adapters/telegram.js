'use strict';

require("dotenv").config();
const TelegramClient = require('node-telegram-bot-api');
const Emulator = require('../gameboy/gameboy.js').Emulator;
const PNG = require('pngjs').PNG;
var emulator = new Emulator("roms/FireRed.gba", process.env.TelegramChatId);

const client = new TelegramClient(process.env.TelegramToken, {polling: true});
var lastMesageTimestamp = new Date().getTime();
var onlySendScreenshotWhenDifferent = true;

const reply_markup = {
  inline_keyboard: [
    [
      {text: "A", callback_data: "!A"},
      {text: "↑", callback_data: "!UP"},
      {text: "B", callback_data: "!B"}
    ],[
      {text: "←", callback_data: "!LEFT"},
      {text: "↓", callback_data: "!DOWN"},
      {text: "→", callback_data: "!RIGHT"}
    ],[
      {text: "START", callback_data: "!START"},
      {text: "SELECT", callback_data: "!SELECT"}
    ]
  ]
};

exports.init = function (){
  startMainLoop();
}

var startMainLoop = () => {
  console.log("Client ready");
  console.log("Starting main loop");

  setInterval(() => {
      if (new Date().getTime() - lastMesageTimestamp < 30000){
          postScreenshot()
      }
  }, 2000);
};

client.onText(/\!/, (message) => onMessageReceived(message));

client.on('callback_query', (msg) => {
  msg.text = msg.data;
  msg.date = new Date().getTime();
  onMessageReceived(msg)
})

var onMessageReceived = (message) => {
  if (message.from.is_bot ){
      return;
  }

  // Commands should start with a '/'
  if (message.text.startsWith('!')){
      lastMesageTimestamp = message.date * 1000;
      var command = message.text.slice(1).trim().toLowerCase();

      processCommand(command, message);
  }
};

function processCommand(command, message){
  var commands = command.split(" ");
  let feedback;

  switch(commands[0]){
      case "help":
          feedback = sendHelpMessage(message);
          break;
      case "load":
          feedback = processLoad(commands, message);
          break;
      case "save":
          feedback = processSave(commands, message);
          break;
      case "update":        
          var chatId = getGameboyChatId();
          var screen = emulator.takeScreenshot();
          client.sendPhoto(chatId, PNG.sync.write(screen), {
            "reply_markup": reply_markup
          });
      default:
          feedback = emulator.processInput(command);
          break;
  }

  sendMessage(feedback);
}

function sendMessage(feedback) {
  var chatId = getGameboyChatId();
  if (feedback) {
      client.sendMessage(chatId, feedback);
  }
}

function processLoad(commands){
  let state = Number(commands[1]);
  if (state >= 0 && state < 6){
      emulator.readSaveFileAndReset(state);
  } else {
      return "Specify a slot to load to, i.e. `!load 0` to load in slot 0.";
  }
}

function processSave(commands, message){
  let slot = Number(commands[1]);

  if (slot >= 0 && slot < 6){
      emulator.writeSaveFile(slot);
      return `Game has been saved into slot ${slot}.`;
  } else {
      return "Specify a slot to save to, i.e. `!save 0` to save in slot 0.";
  }
}

function getGameboyChatId(){
  return process.env.TelegramChatId;
}

function postScreenshot(){
  var chatId = getGameboyChatId();
  var screen = emulator.takeScreenshot();
  sendScreenshot(chatId, screen);
}

async function sendScreenshot(chatId, file){
  if (onlySendScreenshotWhenDifferent) {
    var areDifferent = await screenshotComparer.isDifferentFromPosted(file)
    if (areDifferent == true) {
      await client.sendPhoto(chatId, PNG.sync.write(file), {
        "reply_markup": reply_markup
      });
    }
  } else {
    await client.sendPhoto(chatId, PNG.sync.write(file), {
      "reply_markup": reply_markup
    });
  }
}

function sendHelpMessage(){
  var helpText = "Let's play Pokemon! You can play the game here in Discord by sending commands. Your input needs to " +
  "start with a `!`.\n\n" +
  "To reduce bandwidth, only one image every two seconds will be posted. Furthermore, no more " +
  "images will be posted 10 seconds after the last command was received. Also, if a new image " +
  "is identical to the previously posted message, it will not be posted. You can explicitly " +
  "request new image with the `!update`-command.\n\n" +
  "**Controls**\n`!A`, `!B`, `!START`, `!SELECT`, and the directional buttons `!UP`, `!DOWN`, `!LEFT`, and `!RIGHT`.\n\n" +
  "**Other Commands**\n`!save n`:\n" +
  "Save the current savefile in the GameBoys Memory Card to slot `n`.\n" +
  "There are 6 slots you can use: 0, 1, .., 5.\n" +
  "Note: After saving the game, use `!save n` to create a save state in slot `n`." +
  "`!load n`:\n" +
  "Load the savefile in slot `n` into the Gameboy. This will reset the Gameboy " +
  "and allow you to continue where the game was last saved.\n" +
  "`!update`:\n" +
  "Sends a new frame, regardless of time since last command.\n" +
  "`!help`:\n" +
  "Prints this help message.\n\n" +
  "**Advanced Commands**\n\n*Chaining*:\nYou can input multiple instructions at once, e.g. `!a down a`. " +
  "Each button will be pressed for 300ms.\n" +
  "*Duration*:\nPostfix a duration to hold the button, e.g. `!b500ms` " +
  "to hold `B` for 500 milliseconds or `!right2s` to hold `→` for 2 seconds.\n" +
  "*Not pressing*:\nA dot `.` in a chained command corresponds to not pressing a button.\n" +
  "*Holding buttons*: \nPrefix an underscore `_` to hold a button for the duration of a " +
  "chained command, e.g. `!_b up5s` holds the `B` button down while pressing `↑`.";
  
  return helpText;
}