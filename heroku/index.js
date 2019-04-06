const TelegramBot = require('node-telegram-bot-api');
const TOKEN = require('./config/token');

const options = {
    webHook: {
      port: process.env.PORT
    }
  };
  
const url = process.env.APP_URL || 'https://botjs-xerife.herokuapp.com:443';
const bot = new TelegramBot(TOKEN, options);

let debug_mode = true;

bot.setWebHook(`${url}/bot${TOKEN}`);

bot.on('message', (msg) => {

    log(msg);
    log('msg.from.id = ' + msg.from.id);
    log('msg.chat.id = ' + msg.chat.id);
    
    if ( ajustarTexto(msg.text, "/ajuda") )
        bot.sendMessage(msg.chat.id,functionAjuda());

    if ( ajustarTexto(msg.text, "/oi") ){
        bot.sendMessage(msg.chat.id,functionOi(msg.from.first_name));
    }
        
});

function functionAjuda() {
    return "Este grupo é para compartilhar DICAS DE ATUALIZAÇÃO \n[Para colaboradores do IU!!]\n\n"+
           "Eu sou o Xerife, o Bot que está aqui para te ajudar :)\n\n" +
           "A lista a seguir são os comandos que consigo atender:\n\n" +
           "*/ajuda* - Lista os comandos disponíveis'\n " + 
           "*/oi* - Responde 'USUARIO', em que posso lhe ajudar?";  
} 

function functionOi(usuario) {
    return "Oi " + usuario + ", em que posso lhe ajudar?"; 
} 

function ajustarTexto(msgOriginal, comando) {
    return (msgOriginal.toString().toLowerCase().indexOf(comando) === 0); 
}

function log(message){
    if (debug_mode == true)
        console.log(message)
}