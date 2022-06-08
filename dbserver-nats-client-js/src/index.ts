import {createSubscriber, initConnection, publishMessage, addToRequestReplyMap} from "./nats-connector";
import {
  initStreamConnection,
  createStreamPushSubscriber,
  createPullConsumer
} from "./nats-stream-connector";
import {ConnectionOptions, jwtAuthenticator, StringCodec} from "nats";
import * as cred from "./token.json";

const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const port = 8000;
const jwtAuth = jwtAuthenticator(cred.jenkins1_internal)
const natsConnectOptions: ConnectionOptions = {
  servers: ["tls://platform-nats-internal-cluster.nxengg.cloud:443"],
  authenticator: jwtAuth,
  debug: true,
  noEcho: true,
  ignoreClusterUpdates: true,
  maxReconnectAttempts: 5,
  name: "Shurya",
  tls: {
    caFile: "/Users/shurya/poc/certs/cpaas-ca-int.pem"
  }
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

app.post('/create-push-consumer', (req, res) => {
  createStreamPushSubscriber(req.body.subject, req.body.name).then(response => {
    res.send(response);
  })
})

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



  initConnection(natsConnectOptions).then(natsConnection => {
    if (!natsConnection) {
      throw `Failed to establish connection to ${JSON.stringify(natsConnectOptions.servers)}`
    }
    initStreamConnection(natsConnection).then(isStreamConEstablished => {
      if (!isStreamConEstablished) {
        throw `Failed to establish stream connection`
      }
    });
    // createSubscriber(argv.command_subject);
    // addToRequestReplyMap(argv.reply_subject, argv.request_subject);
    // createPullConsumer("66dcc41f-9561-4818-ac68-64f1d3331e90.a2708194-1a07-4261-9cfa-a0ec68ed5758.operations","a2708194-1a07-4261-9cfa-a0ec68ed5758")
    // let count=0, startTime = new Date();
    // console.log("Start Time: " + startTime)
    // publishTest(startTime, natsConnection)
    // for(count=0; count<10; count++){
    //   waitFun().then(r => {
    //     publishTest(startTime, natsConnection)
    //   });
    // 66dcc41f-9561-4818-ac68-64f1d3331e90.*.requests
    // }
    // publishMessage("test1", "I AM AWESOME").then(response => {
    //   // res.send(response)
    //   console.log(response)
    // })
    createPullConsumer('orchestrator.operations', 'orchestrator_stream')
  });




  // try{
  //   if((argv.hasOwnProperty('command_subject') && typeof argv.command_subject == 'string') &&
  //     (argv.hasOwnProperty('request_subject') && typeof argv.request_subject == 'string') &&
  //     (argv.hasOwnProperty('reply_subject') && typeof argv.reply_subject == 'string')){
  //     console.log(`Nats Client App listening on port ${port}`)
  //
  //   } else{
  //     throw 'Improper Invocation. Use npm start -- --command_subject <<sub>> ' +
  //     '--request_subject <<sub>> --reply_subject <<sub>>'
  //   }
  // } catch (e){
  //   console.log(e)
  //   server.close(e)
  // }
});

// function publishTest(startTime, natsConnection){
//   const sc = StringCodec();
//   var i = 0;
//   for(i=0; i<1000; i++){
//     let node = 0;
//     const requestOptions = {
//       timeout: 60000,
//       noMux: true,
//       reply: `${Math.ceil(Math.random() * 10020)}.${Math.ceil(Math.random() * 1000)}`
//     }
//     natsConnection.request("bench", sc.encode("message " + i), requestOptions).then(response => {
//       // let res = JSON.parse(sc.decode(response.data));
//       // if(res.hasOwnProperty('id')){
//       //   node++;
//       // }
//       var endTime = new Date();
//       console.log(" End time: " + new Date());
//       console.log(" Time Difference: " + (endTime.getTime() - startTime.getTime())/1000 + " ; Node - " + node)
//     });
//   }
// }

async function waitFun() {
  await new Promise(resolve => setTimeout(resolve, 2000));
}

app.use("/", router);