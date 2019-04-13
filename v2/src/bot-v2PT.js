import TelegramBotClient from 'node-telegram-bot-api'
import StateMachine from 'javascript-state-machine'

function createFsm() {
  return StateMachine.create({
    initial: 'waitingstart',
    final: 'final',
    events: [
      { name: 'gotstart', from: 'waitingstart', to: 'waitingtag' },
      { name: 'gottag', from: 'waitingtag', to: 'echoing' },
      { name: 'gottext', from: 'echoing', to: 'echoing' },
      { name: 'gotstop', from: 'echoing', to: 'confirm' },
      { name: 'confirmed', from: 'confirm', to: 'final' },
      { name: 'cancelled', from: 'confirm', to: 'echoing' },
      { name: 'invalid', from: 'confirm', to: 'confirm' }
    ]
  })
}

function eventFromStateAndMessageText(state, text, cmd) {
  switch (state) {
  case 'waitingstart':
    return text === '/url' && 'gotstart'
    break
  case 'waitingtag':
    return 'gottag'
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
                                            'Qual a TAG desse link?',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongottag = (event, from, to, message) => {
      name = message.text
      lastMessage = this.client.sendMessage(message.chat.id,
                                            `Tag ${name}, registrada Eu vou repetir essa tag até você dar o comando /stop`,
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongottext = (event, from, to, message) => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            `Repetindo ${name}: ${message.text}`,
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
