var dotenv = require('dotenv')
dotenv.config({ silent: true })
dotenv.load()

var path = require('path')

require('babel-polyfill')
require('babel-register')

const TOKEN = require('./config/token');

var Bot = require('./src/bot').default
var bot = new Bot(TOKEN)

bot.start()
