import TelegramBotClient from 'node-telegram-bot-api'
import StateMachine from 'javascript-state-machine'

function createFsm() {
  return StateMachine.create({
    initial: 'inicio',
    final: 'final',
    events: [
      { name: 'onZero'  , from: 'i', to: 'a' },
      { name: 'onUm'    , from: 'a', to: 'l' },
      { name: 'onDois'  , from: 'l', to: 'a' },
      { name: 'onTres'  , from: 'a', to: 'u' },
      { name: 'onQuatro', from: 'u', to: 't' },
      { name: 'onCinco' , from: 't', to: 't' },
      { name: 'onSeis'  , from: 't', to: 'a' },
      { name: 'onSete'  , from: 't', to: 'final' },
      { name: 'onOito'  , from: 'u', to: 'a' },
      { name: 'onNove'  , from: 'u', to: 'final' },
      { name: 'onDez'   , from: 'a', to: 'a' },
      { name: 'onOnze'  , from: 'a', to: 'final' }
    ]
  })
}

function eventFromStateAndMessageText(state, text) {
  console.log(state)

  switch (state) {
  case 'inicio':
  console.log(text === '/bookmark' && 'onZero')
    return text === '/bookmark' && 'onZero'
    break

  case 'i':
    return 'a'
    break

  case 'a':
    if (text === '/list')
      return 'l'
    else if (text === '/add')
      return 'u'
    else if (text === '/fim')
      return 'final'
    else
      return 'a'
    break

  case 'l':
    return 'a'
    break

  case 'u':
    if (text === '/url')
      return 't'
    else if (text === '/cancel')
      return 'a'
    else if (text === '/fim')
      return 'final'
    else 
      return 'u'
    break

  case 't':
    return text === '/fim' ? 'z' : 't'
    break
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

    fsm.onZero = () => {
      //urladress = message.text.split(' ')
      // TODO: Entender como capturar a url enviada no inicio do comando. Ex: /url www.uol.com.br
      // if (urladress.length == 1)
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Qual URL deseja guardar?',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
      // else{
      //   fsm.ongoturl(event, from, to, message, urladress[1]) 
      //   lastMessage = this.client.sendMessage(message.chat.id,
      //                                         'URL armazenada com sucesso!')
    }
    
    fsm.onUm = (event, from, to, message)=>{
      lastMessage = this.client.sendMessage(message.chat.id, 'Listando todas as URLs guardadas...')
    }
    
    fsm.onDois = (event, from, to, message)=>{}
    fsm.onTres = (event, from, to, message)=>{}
    fsm.onQuatro = (event, from, to, message)=>{}
    fsm.onCinco = (event, from, to, message)=>{}
    fsm.onSeis = (event, from, to, message)=>{}
    fsm.onSete = (event, from, to, message)=>{}
    fsm.onOito = (event, from, to, message)=>{}
    fsm.onNove = (event, from, to, message)=>{}
    fsm.onDez = (event, from, to, message)=>{}
    fsm.onOnze = (event, from, to, message)=>{}


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
      // let textArray = text.split(' ')

      // if (textArray.length == 1)
      //   textArray.push('')
  
      // let event = eventFromStateAndMessageText(fsm.current, textArray[0], textArray[1])
      
      let event = eventFromStateAndMessageText(fsm.current, text)

      console.log(event)
      console.log(!event )
      console.log(fsm.cannot(event))
      console.log( ( !event || fsm.cannot(event) ) )

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
