import TelegramBotClient from 'node-telegram-bot-api'
import StateMachine from 'javascript-state-machine'

let tagList = [];
let urlTagList = [];
let _nome = '';
let _url = ''; 

function createFsm() {
  return StateMachine.create({
    initial: 'waitingstart',
    final: 'final',
    events: [
      { name: 'gotstart', from: 'waitingstart', to: 'waitingURL' },
      { name: 'gotURLstop', from: 'waitingURL', to: 'final' },
      { name: 'gotURL', from: 'waitingURL', to: 'waitingTAG' },
      { name: 'gotTAG', from: 'waitingTAG', to: 'echoing' },
      { name: 'gotTAGstop', from: 'waitingTAG', to: 'final' },
      { name: 'gottext', from: 'echoing', to: 'echoing' },
      { name: 'gotstop', from: 'echoing', to: 'final' }
    ]
  })
}

function eventFromStateAndMessageText(state, text) {
  text = text.toLowerCase();

  console.log('switch---> ' + state);

  switch (state) {
  case 'waitingstart':
    limparVariaveis();
    let textAux = text.split('@');
    if (textAux.length == 2 && (text == '/url@' + textAux[1]))
        return text === '/url@' + textAux[1] && 'gotstart';
    else if (text == '/url')
        return text === '/url' && 'gotstart';
    else if (text == 'url')
        return text === 'url' && 'gotstart';
    break
  case 'waitingURL':
    return (text === '/stop' || text === 'stop') ? 'gotURLstop' : 'gotURL'
    break
  case 'waitingTAG':
    return (text === '/stop' || text === 'stop') ? 'gotTAGstop' : 'gotTAG'
    break
  case 'echoing':
    if (text == '/stop') 
        return text === '/stop' ? 'gotstop' : 'gottext'
    else if (text == 'stop') 
        return text === 'stop' ? 'gotstop' : 'gottext'
    else
      return 'gottext';
    break
  }
}

function limparVariaveis(){
    tagList = [];
    urlTagList = [];
    _nome = '';
    _url = ''; 
}

function salvarURL(url, nomeUsuario){
    _url = url.toLowerCase();
    _nome = nomeUsuario;
}
  
function salvarTAG(tag){
    tagList.push(tag.toLowerCase())
}

function formatarUrlTag(){
    urlTagList.push({"url": _url, "tags": tagList, "usuario": _nome})
    console.log(urlTagList)
    return urlTagList;
}

function salvarDados(dados) {
    var request = require('request');
    var wwDominio = "https://botjs-xerife-backend.herokuapp.com"
    var urlServico = wwDominio+'/urls';
    var metodo = "POST";

    var options = {
        "uri"   : urlServico,
        "method": metodo,
        "json"  : dados
    };
  
    request(options, (error, response, dados) => {
        var retorno = true;
        if (response.statusCode == 200 || response.statusCode == 201)
            console.log("URL salva.");
        else{
            console.log("Algo deu errado!\n" + error);
            retorno = false;
        }
        return retorno;
    });
    limparVariaveis();
}

export default class Bot {
  constructor(token) {
    this.client = new TelegramBotClient(token, { polling: true })
  }

  start() {
    this.client.on('message', message => {
      if (!message.reply_to_message) {
        this.respondTo(message)
      }
    })
  }

  async respondTo(message) {
    let fsm = createFsm()
    let lastReply = message

    let name
    let lastMessage

    fsm.ongotstart = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Informe o link que deseja salvar.',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongotURL = (event, from, to, message) => {
      name = message.text
      salvarURL(name, message.from.first_name)
      lastMessage = this.client.sendMessage(message.chat.id,
                                            `Informe uma tag para URL ${name}.`,
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongotTAG = (event, from, to, message) => {
      name = message.text;
      salvarTAG(name);
      lastMessage = this.client.sendMessage(message.chat.id,
                                            `Informe outra tag ou /stop para sair.`,
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongottext = (event, from, to, message) => {
      name = message.text;
      salvarTAG(name);
      lastMessage = this.client.sendMessage(message.chat.id,
                                            `Informe uma tag ou /stop para sair.`,
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongotstop = () => {
    var msg = 'URL salva. Até a próxima!';
      if ( salvarDados(formatarUrlTag()) == false)
          msg = 'Algo deu errado e não foi possível salvar os dados.\n Tente novamente mais tarde!\nAté a próxima!'
        lastMessage = this.client.sendMessage(message.chat.id, msg)
    }

    fsm.ongotURLstop = () => {
        lastMessage = this.client.sendMessage(message.chat.id, "Nenhuma url foi salva. Até a próxima!")
    }

    fsm.ongotTAGstop = () => {
      var msg = 'URL salva. Até a próxima!';
      if ( salvarDados(formatarUrlTag()) == false)
        msg = 'Não foi possível salvar os dados.\nTente novamente mais tarde!\nAté a próxima!'
        lastMessage = this.client.sendMessage(message.chat.id, msg)
    }

    while (!fsm.isFinished()) {
      let text = lastReply.text
      let event = eventFromStateAndMessageText(fsm.current, text)
      console.log(event)

      if (!event || fsm.cannot(event)) {
        this.client.sendMessage(message.chat.id, 'Comando não esperado, por favor tente /url')
        break
      }

      fsm[event](lastReply)

      let sentMessage = await lastMessage
      lastReply = await new Promise(resolve => this.client.onReplyToMessage(sentMessage.chat.id, sentMessage.message_id, resolve))
    }
  }
}