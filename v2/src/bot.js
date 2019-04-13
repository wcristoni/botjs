import TelegramBotClient from 'node-telegram-bot-api'
import StateMachine from 'javascript-state-machine'

function createFsm() {
  return StateMachine.create({
    initial: 'waitingstart',
    final: 'final',
    events: [
      { name: 'gotstart', from: 'waitingstart', to: 'waitingURL' },
      { name: 'gotURL', from: 'waitingURL', to: 'waitingTAG' },
      { name: 'gotTAG', from: 'waitingTAG', to: 'echoing' },
      { name: 'gottext', from: 'echoing', to: 'echoing' },
      { name: 'gotstop', from: 'echoing', to: 'confirm' },
      { name: 'confirmed', from: 'confirm', to: 'final' },
      { name: 'cancelled', from: 'confirm', to: 'echoing' },
      { name: 'invalid', from: 'confirm', to: 'confirm' }
    ]
  })
}

function eventFromStateAndMessageText(state, text) {
  console.log(state)
  switch (state) {
  case 'waitingstart':
    console.log(text)
    let textAux = text.split('@');
    if (textAux.length == 1)
      return text === '/url' && 'gotstart'
    else
      return text === '/url@' + textAux[1] && 'gotstart'
    break
  case 'waitingURL':
    return 'gotURL'
    break
  case 'waitingTAG':
    return text === '/stop' ? 'gotstop' : 'gotTAG'
    break
  case 'echoing':
    return text === '/stop' ? 'gotstop' : 'gottext'
    break
  case 'confirm':
    if (text.toLowerCase() === 'sim' || text.toLowerCase() === 's') {
      return 'confirmed'
    } else if (text.toLowerCase() === 'não' || text.toLowerCase() === 'nao' || text.toLowerCase() === 'n') {
      return 'cancelled'
    } else {
      return 'invalid'
    }
  }
}


let tagList = [];
let urlTagList = []
function salvarURL(url, nomeUsuario){
  tagList.push(url);
  tagList.push(nomeUsuario);
}

function salvarTAG(tag){
  tagList.push(tag)
}

function formatarUrlTag(){
  var url = tagList[0];
  var nomeUsuario = tagList[1];
  tagList.shift();
  tagList.shift();
  urlTagList.push({"url": url, "tags": tagList, "usuario": nomeUsuario})
  console.log(urlTagList)
}

function criarArquivo(fs){
  var urls = JSON.stringify({"urls":urlTagList}, null, 2);
  fs.writeFile('urls.json', urls, 'utf8', function(err) {
    if (err) throw err;
    console.log('dados salvos!');
    tagList = [];
    urlTagList = [];
  });
}

function salvarDados(fs){
  var data = fs.readFileSync('urls.json');
  var bookmark = JSON.parse(data);
  bookmark.urls.push(urlTagList);
  var data = JSON.stringify(bookmark, null, 2);
  fs.writeFile('urls.json', data, 'utf8', function(err) {
    if (err) throw err;
    console.log('dados salvos!');
    tagList = [];
    urlTagList = [];
  });
}

function imprimirTAG(){
  //TODO: Fazer a chamada do serviço para salvar a TAG e URL
  var fs = require('fs');
  formatarUrlTag();
  if (!fs.existsSync('urls.json'))
    criarArquivo(fs);
  else
    salvarDados(fs);
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
                                            `A URL ${name} foi salva.\nInforme uma tag para o link.`,
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongotTAG = (event, from, to, message) => {
      name = message.text
      salvarTAG(name)
      lastMessage = this.client.sendMessage(message.chat.id,
                                            `A TAG ${name}, foi salva.\nInforme uma tag, ou /stop para sair.`,
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongottext = (event, from, to, message) => {
      name = message.text
      salvarTAG(name)
      lastMessage = this.client.sendMessage(message.chat.id,
                                            `A TAG ${name}, foi salva.\nInforme uma tag, ou /stop para sair.`,
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongotstop = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Confirma a saída? ([S]im/[N]ão)',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.onconfirmed = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Até a próxima!')
      imprimirTAG()
    }

    fsm.oncancelled = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Saída abortada!',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.oninvalid = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Não entendi, você deseja abortar a operação? ([S]im/[N]ão)',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    while (!fsm.isFinished()) {
      let text = lastReply.text
      let event = eventFromStateAndMessageText(fsm.current, text)

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
