import {NatsConnection} from "nats/lib/src/nats-base-client";
import {Subscription} from "nats/lib/nats-base-client/types";
import {ConnectionOptions} from "nats";

const axios = require('axios');
const {connect, StringCodec} = require("nats");
const sc = StringCodec();
let natsConnection: NatsConnection;

//Maintaining the subscription to perform operations on them
let subscriptionMap: Map<string, Subscription> = new Map<string, Subscription>();
let replyRequestMap: Map<string, string> = new Map<string, string>();

async function initConnection(natsConnectOptions: ConnectionOptions): Promise<NatsConnection | void> {
  try {
    console.log("Initializing connection to NATS server")
    natsConnection = await connect(natsConnectOptions);
    console.log(`connected to ${natsConnection.getServer()}`);
    return natsConnection;
  } catch (e) {
    console.log("Failed to connect to NATS Server");
    return;
  }
}

function closeClientConnection(): Promise<void>{
  if(natsConnection != null){
    return natsConnection.close().then(response => {
      console.log("Connection to NATS Server closed");
      return;
    }).catch(err => {
      console.log("Failed to close connection")
      return;
    })
  }
  return new Promise<void>((resolve,reject)=>{
    resolve();
  });
}

function addToRequestReplyMap(replySubject: string, requestSubject: string){
  replyRequestMap.set(requestSubject, replySubject);
}

function createSubscriber(subject: string, requestSubject?: string) {
  const subscription = natsConnection.subscribe(subject);
  subscriptionMap.set(subject, subscription);
  if (!!requestSubject) {
    replyRequestMap.set(requestSubject, subject);
  }
  (async () => {
    for await (const m of subscription) {
      console.log(`[${subscription.getSubject()} - ${subscription.getProcessed()}]: ${sc.decode(m.data)}`);
      if (!!m.reply) {
        axios.get('https://random-data-api.com/api/device/random_device')
          .then(response => {
            response.data.id = m.data + '-' + subscription.getSubject() + '-' + subscription.getProcessed();
            m.respond(sc.encode(JSON.stringify(response.data)))
          })
          .catch(error => {
            console.log(error);
          });
      }
    }
  })();
}

async function publishMessage(subject: string, message: any) {
  if (replyRequestMap.has(subject)) {
    const requestOptions = {
      timeout: 5000,
      reply: replyRequestMap.get(subject),
      noMux: true
    }
    const response = await natsConnection.request(subject, sc.encode(message), requestOptions);
    return {
      message: `Published message in topic ${subject} and received response`,
      response: sc.decode(response.data)
    }
  } else {
    natsConnection.publish(subject, sc.encode(message))
    return {
      message: `Published message in topic ${subject}`,
      response: null
    }
  }
}

export {initConnection, closeClientConnection, createSubscriber, publishMessage, addToRequestReplyMap};