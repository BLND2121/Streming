const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');

const token = process.argv[2];
const channelId = process.argv[3];

const client = new Client();

client.once('ready', async () => {
  console.log(`Bot with token ${token} is ready!`);

  try {
    const channel = await client.channels.fetch(channelId);

    setTimeout(() => {
      try {
        const connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator,
        });

        console.log(`Joined the voice channel: ${channelId}`);

        connection.on('stateChange', (state) => {
          console.log(`Connection state changed: ${state.status}`);
        });

        connection.on('error', (error) => {
          console.error(`Voice connection error: ${error}`);
        });

        connection.on('disconnect', (disconnectReason) => {
          console.log(`Disconnected from voice channel: ${disconnectReason}`);
        });
      } catch (error) {
        console.error(`Error joining the voice channel: ${error}`);
      }
    }, 1000);
  } catch (error) {
    console.error(`Error fetching the channel: ${error}`);
  }
});

client.login(token);
