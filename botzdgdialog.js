const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const {WebhookClient} = require('dialogflow-fulfillment');
const dialogflow = require('@google-cloud/dialogflow');
const sessionClient = new dialogflow.SessionsClient({keyFilename: 'zdg-9un9-0aba54d6e44c.json'});

app.post('/webhook', function(request,response){
  const agent = new WebhookClient ({ request, response });

      let intentMap = new Map();
      intentMap.set('nomedaintencao', nomedafuncao)
      agent.handleRequest(intentMap);
}); 
function nomedafuncao (agent) {
}  
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
function isBlank(str) {
  return (!str || /^\s*$/.test(str));
}
async function detectIntent(
  projectId,
  sessionId,
  query,
  contexts,
  languageCode
) {
  const sessionPath = sessionClient.projectAgentSessionPath(
    projectId,
    sessionId
  );

  // The text query request.
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: query,
        languageCode: languageCode,
      },
    },
  };

  if (contexts && contexts.length > 0) {
    request.queryParams = {
      contexts: contexts,
    };
  }

  const responses = await sessionClient.detectIntent(request);
  return responses[0];
}
async function executeQueries(projectId, sessionId, queries, languageCode) {
  let context;
  let intentResponse;
  for (const query of queries) {
      try {
          console.log(`Pergunta: ${query}`);
          intentResponse = await detectIntent(
              projectId,
              sessionId,
              query,
              context,
              languageCode
          );
          //console.log('Enviando Resposta');
          if (isBlank(intentResponse.queryResult.fulfillmentText)){
              console.log('Sem resposta definida no DialogFlow');
              return null;   
          }
          else {
              console.log('Resposta definida no DialogFlow');
              //console.log(intentResponse.queryResult.fulfillmentText);
              return `${intentResponse.queryResult.fulfillmentText}`
          }
      } catch (error) {
          console.log(error);
      }
  }
}
app.use(fileUpload({
debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bot-zdg' }),
  puppeteer: { headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ] }
});

client.initialize();

io.on('connection', function(socket) {
  socket.emit('message', '© BOT-ZDG - Iniciado');
  socket.emit('qr', './icon.svg');

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', '© BOT-ZDG QRCode recebido, aponte a câmera  seu celular!');
    });
});

client.on('ready', () => {
    socket.emit('ready', '© BOT-ZDG Dispositivo pronto!');
    socket.emit('message', '© BOT-ZDG Dispositivo pronto!');
    socket.emit('qr', './check.svg')	
    console.log('© BOT-ZDG Dispositivo pronto');
});

client.on('authenticated', () => {
    socket.emit('authenticated', '© BOT-ZDG Autenticado!');
    socket.emit('message', '© BOT-ZDG Autenticado!');
    console.log('© BOT-ZDG Autenticado');
});

client.on('auth_failure', function() {
    socket.emit('message', '© BOT-ZDG Falha na autenticação, reiniciando...');
    console.error('© BOT-ZDG Falha na autenticação');
});

client.on('change_state', state => {
  console.log('© BOT-ZDG Status de conexão: ', state );
});

client.on('disconnected', (reason) => {
  socket.emit('message', '© BOT-ZDG Cliente desconectado!');
  console.log('© BOT-ZDG Cliente desconectado', reason);
  client.initialize();
});
});

// Send message
app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDD = number.substr(0, 2);
  const numberUser = number.substr(-8, 8);
  const message = req.body.message;

  if (numberDDD <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDD > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Mensagem não enviada',
      response: err.text
    });
    });
  }
});


// Send media
app.post('/send-media', async (req, res) => {
  const number = req.body.number;
  const numberDDD = number.substr(0, 2);
  const numberUser = number.substr(-8, 8);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  if (numberDDD <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Imagem não enviada',
      response: err.text
    });
    });
  }

  else if (numberDDD > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Imagem não enviada',
      response: err.text
    });
    });
  }
});


client.on('message', async msg => {
  console.log('Mensagem recebida', msg);
  let textoResposta = await executeQueries('zdg-9un9', msg.from, [msg.body], 'pt-br');
  msg.reply(textoResposta.replace(/\\n/g, '\n'));
});

    
server.listen(port, function() {
        console.log('App running on *: ' + port);
});