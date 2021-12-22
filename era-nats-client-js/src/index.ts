import {createSubscriber, initConnection, closeClientConnection, publishMessage, addToRequestReplyMap} from "./nats-connector";
import {initStreamConnection, addStream, addDurableConsumer, publishMessageToStream, removeDurableConsumer} from './nats-stream-connector';
import {ConnectionOptions} from "nats";

const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const port = 7000;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const natsConnectOptions: ConnectionOptions = {
  servers: ["10.15.152.170:4222","10.15.152.172:4222","10.15.152.177:4222"],
  token: "NatsEra!",
  debug: true
};

// ------------------------------START OF CONTROLLER----------------------------------------------------


app.get('/', (req, res) => {
  res.send('ERA NATS Client is up!!!')
});

app.post('/add-request-reply-subject', (req, res) => {
  addToRequestReplyMap(req.body.replySubject, req.body.subject)
  res.send(`Added Reply subject ${req.body.replySubject} for ${req.body.subject}`)
});

app.post('/create-subscriber', (req, res) => {
  createSubscriber(req.body.topic)
  res.send(`Created a subscriber for topic ${req.body.topic}`)
});

app.post('/publish-message', (req, res) => {
  publishMessage(req.body.subject, req.body.message).then(response => {
    res.send(response);
  })
});

app.post('/add-stream', (req, res) => {
  console.log(req)
  addStream(req.body.stream, req.body.subject).then(response => {
    res.send(response);
  })
});

app.post('/add-durable-customer', (req, res) => {
  addDurableConsumer(req.body.stream, req.body.durableName).then(response => {
    res.send(response);
  })
});

app.delete('/remove-durable-customer', (req, res) => {
  removeDurableConsumer(req.body.stream, req.body.durableName).then(response => {
    res.send(response);
  })
});

app.post('/publish-stream', (req, res) => {
  publishMessageToStream(req.body.message, req.body.subject).then(response => {
    res.send(response);
  })
});


 // ------------------------------END OF CONTROLLER----------------------------------------------------

const server = app.listen(port, 'localhost', () => {
  try {
    console.log(`Nats Era Client App listening on port ${port}`)
    initConnection(natsConnectOptions).then(natsConnection => {
      if (!natsConnection) {
        throw `Failed to establish connection to ${JSON.stringify(natsConnectOptions.servers)}`
      }
      initStreamConnection(natsConnection).then(isStreamConEstablished => {
        if(!isStreamConEstablished){
          throw `Failed to establish stream connection`
        }
      });
    });
  } catch (e) {
    console.log(e)
    closeClientConnection().then(_ => {
      server.close(e);
    });
  }
});

app.use("/", router);