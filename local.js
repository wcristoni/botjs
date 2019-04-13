const TelegramBot = require('node-telegram-bot-api');
const TOKEN = require('./config/token');
const bot = new TelegramBot(TOKEN, {polling: true});

let debug_mode = true;

bot.on('message', (msg) => {

    log(msg);
    log('msg.from.id = ' + msg.from.id);
    log('msg.chat.id = ' + msg.chat.id);
    
    if ( ajustarTexto(msg.text, "/ajuda") )
        bot.sendMessage(msg.chat.id,functionAjuda());

    if ( ajustarTexto(msg.text, "/oi") ){
        bot.sendMessage(msg.chat.id,functionOi(msg.from.first_name));
    }

    if ( ajustarTexto(msg.text, "/url") ){
        bot.sendMessage(msg.chat.id,functionGuardarURL(msg.text),functionTagOption());
    }
    
        
});

function functionAjuda() {
    return "Este grupo é para compartilhar DICAS DE ATUALIZAÇÃO \n[Para colaboradores do IU!!]\n\n"+
           "Eu sou o Xerife, o Bot que está aqui para te ajudar :)\n\n" +
           "A lista a seguir são os comandos que estrou programado para atender:\n\n" +
           "*/ajuda* - Lista os comandos disponíveis'\n " + 
           "*/oi* - Responde 'USUARIO', em que posso lhe ajudar?";  
} 

function functionOi(usuario) {
    return "Oi " + usuario + ", em que posso lhe ajudar?"; 
} 

function functionGuardarURL(valor){
    return "url: " + valor + " armazenada.";
}

function functionTagOption(){
    return {"reply_markup": {"keyboard": [["Op. 1", "Op 2."],  ["Nenhuma delas"]]}}
}

function ajustarTexto(msgOriginal, comando) {
    return (msgOriginal.toString().toLowerCase().indexOf(comando) === 0); 
}

function log(message){
    if (debug_mode == true)
        console.log(message)
}