const Discord = require('discord.js');
const {
	prefix,
	token,
} = require('./config.json');
const ytdl = require('ytdl-core');
const { executionAsyncResource } = require('async_hooks');
const { SSL_OP_TLS_BLOCK_PADDING_BUG } = require('constants');

const client = new Discord.Client();

client.once('ready', () => {
    console.log('Ready!');
});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});

client.on("message", async message => {
    if(message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if(message.content.startsWith(`${prefix}play`)){
        execute(message, serverQueue);
        return;
    }
    else if(message.content.startsWith(`${prefix}skip`)){
        skip(message, serverQueue);
        return;
    }
    else if(message.content.startsWith(`${prefix}stop`)){
        stop(message, serverQueue);
        return;
    }
    else{
        message.channel.send("Pre di yan valid command");
    }
});

const queue = new Map();

async function execute(message, serverQueue) {
    const args = message.content.split(" ");
    
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
      return message.channel.send(
        "Pre pasok ka munang voice channel bago kita pagbigyan"
      );

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send(
        "Di ako allowed, ganyan yan"
      );
    }

    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };


    if (!serverQueue) {

    }else {
     serverQueue.songs.push(song);
     console.log(serverQueue.songs);
     return message.channel.send(`Pahintay nalang, **${song.title}** added to queue`);
    }

    // Creating the contract for our queue
    const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true,
    };
    // Setting the queue using our contract
    queue.set(message.guild.id, queueContruct);
    // Pushing the song to our songs array
    queueContruct.songs.push(song);

    try {
    // Here we try to join the voicechat and save our connection into our object.
        var connection = await voiceChannel.join();
        queueContruct.connection = connection;
    // Calling the play function to start a song
        play(message.guild, queueContruct.songs[0]);
    } catch (err) {
    // Printing the error message if the bot fails to join the voicechat
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
    }

  }

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Enjoy **${song.title}**`);
  }

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
      return message.channel.send(
        "Pano ko mai-skip e wala ka naman sa voice channel hays"
      );
    if (!serverQueue)
      return message.channel.send("Walang nakaqueue pre para i-skip ko");
    serverQueue.connection.dispatcher.end();
    serverQueue.textChannel.send("**Skipped**");
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
      return message.channel.send(
        "Pano ko mai-skip e wala ka naman sa voice channel hays"
      );
    
    if (!serverQueue)
      return message.channel.send("There is no song that I could stop!");
      
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
    serverQueue.textChannel.send("**Stopped**");
}


client.login(token);