var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  getRecuperarDados(req, res, next);
});

router.post('/', function(req, res) {  
  postSalvar(req, res);
}); 

// Funcao genérica
function retornarStatus(res, statusCode, infos, erro){

  if (statusCode == 200 || statusCode == 201){
    console.log('dados salvos!');
    res.status(200).send(infos);
  }

  if (statusCode == 500){
    console.log(JSON.stringify(erro));
    res.status(500).send({ result: "Erro ao tentar realizar a Operacao\n:" +  + JSON.stringify(infos) + " \n: " + erro});
  }
}

// Funcoes para o POST
function postSalvar(req, res){
  var fs = require('fs');

  if (!fs.existsSync('urls.json'))
    postCriarArquivo(fs, req, res);
  else
    postSalvarDados(fs, req, res);
}

function postCriarArquivo(fs, req, res){
  var erro = null;
  var infos = "Operação Efetuada com Sucesso!";
  var body = req.body;
  var urls = JSON.stringify({"urls":[{body}]}, null, 2);
  var status = 200;

  fs.writeFile('urls.json', urls, 'utf8', function(err) {
    if (err){
      erro = err;
      status = 500;
      infos = "";
    }
    retornarStatus(res, status, infos, erro);
  });
}

function postSalvarDados(fs, req, res){
  var data = fs.readFileSync('urls.json');
  var bookmark = JSON.parse(data);
  var erro = null;
  var infos = "Operação Efetuada com Sucesso!";
  var status = 200;
  
  bookmark.urls.push(req.body);
  data = JSON.stringify(bookmark, null, 2);
  
  fs.writeFile('urls.json', data, 'utf8', function(err) {
    if (err){
      erro = err;
      status = 500;
      infos = "";
    }
    retornarStatus(res, status, infos, erro);
  });
}

// Funcoes para o GET
function getRecuperarDados(req, res, next){
  var data, erro, infos = null;
  var fs = require('fs');
  var status = 200;

  data = fs.readFileSync('urls.json', 'utf8', function(err){
    if (err){
      erro = err;
      status = 500;
    }
  });

  infos = JSON.parse(data);
  retornarStatus(res, status, infos, erro);
}

module.exports = router;