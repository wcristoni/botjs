import TelegramBotClient from 'node-telegram-bot-api'
import StateMachine from 'javascript-state-machine'

function createFsm() {
  return StateMachine.create({
    initial: 'waitingstart',
    final: 'final',
    events: [
      { name: 'gotstart' , from: 'waitingstart', to: 'waitingurl' },
      { name: 'goturl'   , from: 'waitingurl'  , to: 'waitingtag' },
      { name: 'gottag'   , from: 'waitingtag'  , to: 'echoing' },
      { name: 'gottext'  , from: 'echoing'     , to: 'echoing' },
      { name: 'gotstop'  , from: 'echoing'     , to: 'confirm' },
      { name: 'confirmed', from: 'confirm'     , to: 'final' },
      { name: 'cancelled', from: 'confirm'     , to: 'echoing' },
      { name: 'invalid'  , from: 'confirm'     , to: 'confirm' }
    ]
  })
}

function eventFromStateAndMessageText(state, text, cmd) {
  console.log(state)

  switch (state) {
  case 'waitingstart':
    // TODO: Entender como capturar a url vindo no comando
    // return text === '/url ' + cmd && 'gotstart'
    return text === '/url' && 'gotstart'
    break
  case 'waitingurl':
    return 'goturl'
    break
  case 'waitingtag':
    return text === '/stop' ? 'gottext' : 'gottag'
    break
  case 'echoing':
    return text === '/stop' ? 'gotstop' : 'gottext'
    break
  case 'confirm':
    if (text.toLowerCase() === 'sim' || text.toLowerCase() === 's') {
      return 'confirmed'
    } else if (text.toLowerCase() === 'não' || text.toLowerCase() === 'nao' || text.toLowerCase() === 'n')  {
      return 'cancelled'
    } else {
      return 'invalid'
    }
  }
}

let tagList = []
function salvarTag(tag){
  //TODO: Implementar salvar em um database

  tagList.push(tag);
  console.log(tagList)
  return true;
}

function salvarURL(url){
  //TODO: Implementar salvar em um database

  tagList.push({url: url});
  console.log(tagList)
  return true;
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
    let urladress

    fsm.ongotstart = (event, from, to, message) => {
      urladress = message.text.split(' ')
      // TODO: Entender como capturar a url enviada no inicio do comando. Ex: /url www.uol.com.br

      if (urladress.length == 1)
        lastMessage = this.client.sendMessage(message.chat.id,
                                              'Qual URL deseja guardar?',
                                              { reply_markup: JSON.stringify({ force_reply: true }) })
      else{
        fsm.ongoturl(event, from, to, message, urladress[1]) 
        lastMessage = this.client.sendMessage(message.chat.id,
                                              'URL armazenada com sucesso!')
      }
    }

    fsm.ongoturl = (event, from, to, message, url) => {

      //TODO: Quando o comando passado  é '/url www.uol.com.br' a processo para após pedir a TAG,
      //TODO: Criar um novo estado ao invés de chamar o evento diretamente.

      if (url != '')
        urladress = message.text
      else
        urladress = url
      
      console.log(event)

      salvarURL(urladress)
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Qual a TAG desse link?',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongottag = (event, from, to, message) => {
      name = message.text
      salvarTag(name)
      lastMessage = this.client.sendMessage(message.chat.id,
                                            `Tag ${name}, registrada. Se desejar informar outra tag para esse link faça agora, caso contrário digite o comando /stop.`,
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongottext = (event, from, to, message) => {
      name = message.text
      salvarTag(name)
      lastMessage = this.client.sendMessage(message.chat.id,
                                            `Tag ${name}, registrada. Se desejar informar outra tag para esse link faça agora, caso contrário digite o comando /stop.`,
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongotstop = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Você confirma a saída? ([s]im/[n]ão)',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.onconfirmed = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Ok trabalho concluído, até mais!')
    }

    fsm.oncancelled = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'ok, repetindo novamente...',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.oninvalid = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Desculpe, eu não entendi, você deseja cancelar? ([s]im/[n]ão)',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    while (!fsm.isFinished()) {
      let text = lastReply.text
      let textArray = text.split(' ')

      if (textArray.length == 1)
        textArray.push('')
  
      let event = eventFromStateAndMessageText(fsm.current, textArray[0], textArray[1])
      
      if (!event || fsm.cannot(event)) {
        this.client.sendMessage(message.chat.id, 'Eu não estava esperando por isso, tente /url')
        break
      }

      fsm[event](lastReply)

      let sentMessage = await lastMessage
      lastReply = await new Promise(resolve => this.client.onReplyToMessage(sentMessage.chat.id, sentMessage.message_id, resolve))
    }
  }
}
