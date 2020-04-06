const config = require("./botConfig.json");
const eConfig = require("./embedConfig.json")
const Discord = require("discord.js");
const fetch = require('node-fetch');

const bot = new Discord.Client();

let playersData = {};
let playersOnlineMsg = {};
let count = 0;

const prefix = config.prefix;
let reportChannel = {};

bot.on("ready", ()=>{
    console.log(`${bot.user.username} is ready`)
    reportChannel = bot.channels.get(config.reportChannelID);
    fetchPlayers();
});

function fetchPlayers(){
    fetch(config.dataUrl)
    .then(res => res.json())
    .then((data) => {
        playersData = data;
    })
    .catch(err => { throw err });
}


bot.on("message", message =>{
    onMessage(message);  
});

function onMessage(message){
    
    if (!message.content.startsWith(prefix) || message.author.bot) return;

	const command = getCommand(message.content);

	if (command === config.onlineCmd){  
        if (!message.member.hasPermission("ADMINISTRATOR")){
            message.reply("You have to be an admin to use this command");
            return;
        }
        handleOnlineCmd(message);
    }
    else if (command === config.privateCmd){
        handlePrivateMsgCmd(message);
    }
    else if (command === config.reportCmd){
        handleReportCmd(message);
    }
}

function handleReportCmd(msg){
    let text = msg.content.slice(config.reportCmd.length + 1); 
    let embed = getEmbed("Report", text);
    reportChannel.send(embed);
}

function handlePrivateMsgCmd(msg){
    let text = msg.content.slice(config.privateCmd.length + 1); 
    msg.guild.members.forEach(member => {
        if (member.id != bot.user.id && !member.user.bot) 
            member.send(text);
      });
}

function handleOnlineCmd(message){
    // fetch players and store them in playersData variable
    fetchPlayers();

    // check if there are players active right now
    if (playersData === null || playersData.length === 0){
        const embed = getEmbed(eConfig.embedTitle, 'No one is playing')
        message.channel.send(embed);
        return;
    }

    const players = getFormattedPlayers();
    const embed = getEmbed(getFormattedPlayersCount(), '#0099ff', players);
    message.channel.send(embed).then(msg =>{
        playersOnlineMsg = msg;
        createChannel(msg);
    });
    setInterval(fetchPlayersAndEdit, 10000);
    setBotStatus();
}


let countChannel = {};
function createChannel(message){
    message.guild.createChannel(
		getFormattedPlayersCount(),
		"voice",
    )
    .catch(error => console.log(error))
    .then(channel=>{
        countChannel = channel;
        channel.overwritePermissions(message.guild.roles.find('name', '@everyone'), { // Disallow Everyone to see, join, invite, or speak
            'CREATE_INSTANT_INVITE' : false,        'VIEW_CHANNEL': true,
            'CONNECT': false,                       'SPEAK': false
            })
        .catch(error => console.log(error))
    });
}

function setCountChannelName(name){
    countChannel.setName(name);
}

function setBotStatus(){
    bot.user.setActivity(getFormattedPlayersCount());
}

function getCommand(content){
    const args = content.slice(prefix.length).split(/ +/);

	return args.shift().toLowerCase();
}

function fetchPlayersAndEdit(){
    fetchPlayers();
    const players = getFormattedPlayers();
    const embedPlayers = getEmbed(getFormattedPlayersCount(), players);
    playersOnlineMsg.edit(embedPlayers);
    setBotStatus();
    setCountChannelName(getFormattedPlayersCount());
}

function getFormattedPlayersCount(){
    return `${eConfig.embedTitle} [${count}/64]`;
}

function getFormattedPlayers(){
    let players = "";
    count = 0;
    playersData.forEach(p =>{
        count++;
        players += `[${p.id}] ${p.name} \n`;
    });
    return players;
}

function getEmbed(title, desc){

    const embed = new Discord.RichEmbed()
        .setColor(eConfig.embedColor)
        .setTitle(title)
        .setDescription(desc)
        .setThumbnail(eConfig.embedImg)
        .setAuthor("Gov RP - RolePlay Server Status", eConfig.embedImg)
        .setTimestamp()
        .setFooter("IP: fivem.gov-rp.com")
        
    return embed;
}

bot.login(config.token);

