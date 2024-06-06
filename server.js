const http = require('http');
const express = require('express');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OWNER_ID = process.env.owner; // Replace with the bot owner's Discord ID

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve the HTML file on the root route
app.get("/", (request, response) => {
  response.sendFile('web.html', { root: __dirname });
});

// Start the server on the specified port
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const configFile = 'config.json';
const limitsFile = 'limits.json';

// Load existing configuration
let config = {};
if (fs.existsSync(configFile)) {
  config = JSON.parse(fs.readFileSync(configFile));
}

// Load existing limits
let limits = {};
if (fs.existsSync(limitsFile)) {
  limits = JSON.parse(fs.readFileSync(limitsFile));
}

// Store bot processes to manage them
let botProcesses = {};

// Slash command setup
const commands = [
  new SlashCommandBuilder()
    .setName('add_token')
    .setDescription('Add token and voice channel ID')
    .addStringOption(option =>
      option.setName('token')
        .setDescription('The bot token')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('idvoice')
        .setDescription('The voice channel ID')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('remove_token')
    .setDescription('Remove token and stop bot instance')
    .addStringOption(option =>
      option.setName('token')
        .setDescription('The bot token to remove')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('token_list')
    .setDescription('Send the list of tokens in private chat'),
  new SlashCommandBuilder()
    .setName('limit')
    .setDescription('Manage token limits for users')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action to perform (remove/give)')
        .setRequired(true)
        .addChoices(
          { name: 'remove', value: 'remove' },
          { name: 'give', value: 'give' }
        ))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to modify')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('The amount to add/remove')
        .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.t); // Replace with your main bot's token

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.id), // Replace with your main bot's client ID
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log('Main bot is ready!');
});

client.on('interactionCreate', async (interaction) => {
  console.log('Received interaction:', interaction);

  if (!interaction.isCommand()) return;

  const { commandName, options, user } = interaction;

  if (commandName === 'add_token') {
    const token = options.getString('token');
    const channelId = options.getString('idvoice');

    // Get user limit and check if they can add a token
    const userLimit = limits[user.id] || 1;
    const userTokens = Object.values(config).filter(entry => entry.userId === user.id).length;

    if (userTokens >= userLimit) {
      await interaction.reply({ content: `You have reached your token limit of ${userLimit}.`, ephemeral: true });
      return;
    }

    console.log(`Received token: ${token}, channelId: ${channelId} from user: ${user.id}`);

    config[token] = { channelId, userId: user.id };
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    await interaction.reply({ content: `Token and Channel ID have been saved. Starting new bot instance...`, ephemeral: true });

    // Spawn a new bot process
    const botProcess = spawn('node', [path.join(__dirname, 'subBot.js'), token, channelId]);
    botProcesses[token] = botProcess;

    botProcess.stdout.on('data', (data) => {
      console.log(`Bot stdout: ${data}`);
    });

    botProcess.stderr.on('data', (data) => {
      console.error(`Bot stderr: ${data}`);
    });

    botProcess.on('close', (code) => {
      console.log(`Bot process exited with code ${code}`);
      delete botProcesses[token];
    });
  } else if (commandName === 'remove_token') {
    const token = options.getString('token');

    // Check if the user owns the token
    if (config[token] && config[token].userId === user.id) {
      delete config[token];
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

      if (botProcesses[token]) {
        botProcesses[token].kill();
        delete botProcesses[token];
      }

      await interaction.reply({ content: `Token and corresponding bot instance have been removed.`, ephemeral: true });
    } else {
      await interaction.reply({ content: `Token not found or you do not have permission to remove it.`, ephemeral: true });
    }
  } else if (commandName === 'token_list') {
    const user = interaction.user;
    const userTokens = Object.entries(config)
      .filter(([_, entry]) => entry.userId === user.id)
      .map(([token, _]) => token)
      .join('\n') || 'No tokens available.';

    try {
      await user.send(`Here is the list of your tokens:\n${userTokens}`);
      await interaction.reply({ content: 'Token list has been sent to your DMs.', ephemeral: true });
    } catch (error) {
      console.error(`Could not send DM to ${user.tag}.\n`, error);
      await interaction.reply({ content: 'I could not send you a DM. Please check your privacy settings.', ephemeral: true });
    }
  } else if (commandName === 'limit') {
    if (user.id !== OWNER_ID) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }

    const action = options.getString('action');
    const targetUser = options.getUser('user');
    const amount = options.getInteger('amount');

    if (action === 'give') {
      limits[targetUser.id] = (limits[targetUser.id] || 1) + amount;
    } else if (action === 'remove') {
      limits[targetUser.id] = Math.max(1, (limits[targetUser.id] || 1) - amount);
    }

    fs.writeFileSync(limitsFile, JSON.stringify(limits, null, 2));
    await interaction.reply({ content: `User ${targetUser.tag}'s token limit has been updated.`, ephemeral: true });
  }
});

client.login(process.env.t); // Replace with your main bot's token
