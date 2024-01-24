// AmtiXDev Says :
// ======================================================================
// Hello dear user, please do not remove rights from my project.
// Have a nice day.
// مرحبًا عزيزي المستخدم ، يرجى عدم إزالة الحقوق من مشروعي 
// أتمنى لك يومًا سعيدًا.
// ======================================================================

const express = require("express")
const app = express();

app.listen(() => console.log(" >> Ready To Work :) << "));
app.get('/', (req, res) => {
  res.send(` AmtiXDev Says : Hi everyone :) `)
});

const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const { autokill } = require('autokill');
const { amtixtax } = require('amtix-tax');

const amtixdev = new Client({
  checkUpdate: false
});

process.on('unhandledRejection', (reason, p) => {
    console.log(reason, p);
});

process.on('multipleResolves', (type, promise, reason) => {
    console.log(type, promise, reason);
});

setInterval(() => {
  if (!amtixdev || !amtixdev.user) {
    console.log("Client Not Login, Process Kill")
    process.kill(1);
  }
}, 5000);


amtixdev.on('ready', async () => {
  console.log(`Your Account ${amtixdev.user.username} Is Ready!`);
})

amtixdev.on('ready', () => {
    setInterval( async () => {
    amtixdev.channels.fetch("1186031631199383745") // Channel Id (:
     .then((channel) => { 
      const VoiceConnection = joinVoiceChannel({
       channelId: channel.id, 
       guildId: channel.guild.id, 
       adapterCreator: channel.guild.voiceAdapterCreator 
       });
    }).catch((error) => { return; });
    }, 1000)
}); 

amtixdev.login(process.env.token);
