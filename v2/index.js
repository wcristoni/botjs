var dotenv = require('dotenv')
dotenv.config({ silent: true })
dotenv.load()

var path = require('path')

require('babel-polyfill')
require('babel-register')

// var TOKEN = '893259487:AAEqtZZ2z_wXRcR8x9CUPcBUruTXxCehWIU'
//var bot = new Bot(TOKEN)

var Bot = require('./src/bot').default
var bot = new Bot(process.env.BOT_TOKEN)

bot.start()
