'use strict';

require("dotenv").config();
const TelegramClient = require('node-telegram-bot-api');
const Emulator = require('../gameboy/gameboy.js').Emulator;
var emulator = new Emulator("roms/FireRed.gba");

const client = new TelegramClient(process.env.TelegramToken, {polling: true});
var lastMesageTimestamp = new Date().getTime();

exports.init = function (){
  startMainLoop();
  client.onText(/\//, (message) => onMessageReceived(message));
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

client.on('callback_query', (msg) => {
  msg.text = msg.data;
  msg.date = new Date().getTime();
  onMessageReceived(msg)
})

var onMessageReceived = (message) => {
  if (message.from.is_bot ){
      return;
  }

  // Commands should start with a '!'
  if (message.text.startsWith('/')){
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
  var reply_markup = {
    inline_keyboard: [
      [
        {text: "A", callback_data: "/A"},
        {text: "↑", callback_data: "/UP"},
        {text: "B", callback_data: "/B"}
      ],[
        {text: "←", callback_data: "/LEFT"},
        {text: "↓", callback_data: "/DOWN"},
        {text: "→", callback_data: "/RIGHT"}
      ],[
        {text: "START", callback_data: "/START"},
        {text: "SELECT", callback_data: "/SELECT"}
      ]
    ]
  }

  await client.sendPhoto(chatId, file, {
    "reply_markup": reply_markup
  });
}

function sendHelpMessage(){
  var helpText = "Start your input with a `/`. The emulator reacts to " +
                 "`up`, `down`, `left`, `right`, `a`, `b`, `start` and `select`.\n" +
                 "Chaining commands: you can input multiple instructions at once, e.g. `/a down a`." +
                 "Each button will be pressed for 300ms. A dot `.` corresponds to not pressing a button\n" +
                 "Holding buttons: prefix an underscore `_` to hold a button for the duration of a chained" +
                 "input, e.g. `/_b up5s` holds the `B` button down while pressing `↑`.\n" +
                 "Advanced commands: postfix a duration to hold the button, e.g. `/b500ms` " +
                 "to hold `B` for 500 milliseconds or `/right2s` to hold `→` for 2 seconds.\n" +
                 "Saving and Loading: `/save n` will save the current save on the Gameboys Memory Card to " +
                 "slot `n`. `/load n` will load the save into the Gameboys Memory Card and restart the " +
                 "Game so you can load the specified save file. Slots 0, 1 and 2 can be used by everyone. " +
                 "Slots 3, 4 and 5 are reserved for moderators.\n" +
                 "Note: After saving the game, use `/save n` to create a save state in slot `n`."
  
  return helpText;
}