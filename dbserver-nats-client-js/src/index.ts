import {createSubscriber, initConnection, publishMessage, addToRequestReplyMap} from "./nats-connector";
import {
  initStreamConnection,
  createStreamPushSubscriber,
  createPullConsumer
} from "./nats-stream-connector";
import {ConnectionOptions, jwtAuthenticator} from "nats";
import * as cred from "./token.json";

const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const port = 8000;
const jwtAuth = jwtAuthenticator(cred.jwt)
const natsConnectOptions: ConnectionOptions = {
  servers: ["10.15.152.152:4222"],
  authenticator: jwtAuth,
  debug: false,
  noEcho: true,
  ignoreClusterUpdates: true,
  maxReconnectAttempts: 5
};

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Client is up!!!')
});

app.post('/publish-message', (req, res) => {
  publishMessage(req.body.subject, req.body.message).then(response => {
    res.send(response)
  })
});

app.post('/create-pull-consumer', (req, res) => {
  createPullConsumer(req.body.subject, req.body.name).then(response => {
    res.send(response);
  })
})

app.post('/create-subscriber', (req, res) => {
  createSubscriber(req.body.topic)
  res.send(`Created a subscriber for topic ${req.body.topic}`)
});

const server = app.listen(port, 'localhost', () => {
  const argv = require('minimist')(process.argv.slice(2));
  try{
    if((argv.hasOwnProperty('command_subject') && typeof argv.command_subject == 'string') &&
      (argv.hasOwnProperty('request_subject') && typeof argv.request_subject == 'string') &&
      (argv.hasOwnProperty('reply_subject') && typeof argv.reply_subject == 'string')){
      console.log(`Nats Client App listening on port ${port}`)
      initConnection(natsConnectOptions).then(natsConnection => {
        if (!natsConnection) {
          throw `Failed to establish connection to ${JSON.stringify(natsConnectOptions.servers)}`
        }
        initStreamConnection(natsConnection).then(isStreamConEstablished => {
          if (!isStreamConEstablished) {
            throw `Failed to establish stream connection`
          }
        });
        createSubscriber(argv.command_subject);
        addToRequestReplyMap(argv.reply_subject, argv.request_subject);
      });
    } else{
      throw 'Improper Invocation. Use npm start -- --command_subject <<sub>> ' +
      '--request_subject <<sub>> --reply_subject <<sub>>'
    }
  } catch (e){
    console.log(e)
    server.close(e)
  }
});

app.use("/", router);