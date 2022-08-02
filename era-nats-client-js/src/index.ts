import {createSubscriber, initConnection, closeClientConnection, publishMessage, addToRequestReplyMap} from "./nats-connector";
import {initStreamConnection, addStream, addDurableConsumer, publishMessageToStream, removeStream, removeDurableConsumer, findStreamBySubject} from './nats-stream-connector';
import {ConnectionOptions, credsAuthenticator, jwtAuthenticator, StringCodec} from "nats";
import * as cred from "./eratoken.json";
import * as work from "./work.json";
import * as request from "./test.json";
import {response} from "express";
import {TextEncoder} from "util";
import {RetentionPolicy, StorageType, StreamConfig} from "nats/lib/src/nats-base-client";

const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const port = 7000;

const app = express();
const sc = StringCodec();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const jwtAuth = jwtAuthenticator(cred.jenkins1_external);
// const credAuth = credsAuthenticator(new TextEncoder().encode(cred.qw));
// CPAAS -server : 10.195.80.181
// platform-nats-internal-cluster.nxengg.cloud
// platform-nats-cluster1.nxengg.cloud
// NATS_EC2 -server: tls://ec2-18-219-76-103.us-east-2.compute.amazonaws.com:4222

// tls: {
//   caFile: "/Users/shurya/poc/bash_scripts/ec2-ca.pem",
// },
const natsConnectOptions: ConnectionOptions = {
  servers: ["tls://platform-nats-cluster1.nxengg.cloud:443"],
  authenticator: jwtAuth,
  debug: true,
  noEcho: true,
  ignoreClusterUpdates: true,
  maxReconnectAttempts: 5,
  name: "TEEEEEETTTTT",
  tls: {
    caFile: "/Users/shurya/poc/certs/cpaas-ca.pem"
  }
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
  console.log("Request received at: " + new Date().toISOString())
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

app.post('/test', (req, res) => {
  findStreamBySubject(req.body.topic, req.body.stream).then(response => {
    console.log(response);
    res.send(response);
  })
})

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
      // publishMessage(request.subject, request.message)
      initStreamConnection(natsConnection).then(isStreamConEstablished => {
      //   // createSubscriber("_INBOX.*.*")
      //   // createSubscriber("tenant1.dbserv1.request", "tenant1.dbserv1.reply")
      //   // createSubscriber("dbserver_registration", "res")
        if(!isStreamConEstablished){
          throw `Failed to establish stream connection`
        }


      //
      //   // removeStream("dbserv1_stream")
      //   // removeDurableConsumer("dbserv1_stream","dbserv1")
      //   createSubscriber("dbserver_registration")
      //   // publishMessageToStream(work.message, work.subject).then(response => {
      //   //   console.log(response)
      //   // })
      //
      //
      //
      //   // addStream("orchestrator_stream","orchestrator.operations")
      });
    }).catch(err => {
      console.log(err)
    });
  } catch (e) {
    console.log(e)
    closeClientConnection().then(_ => {
      server.close(e);
    });
  }
});

app.use("/", router);