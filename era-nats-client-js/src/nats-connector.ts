import {NatsConnection} from "nats/lib/src/nats-base-client";
import {Subscription} from "nats/lib/nats-base-client/types";
import {ConnectionOptions} from "nats";
import * as https from "https";
import {addDurableConsumer, addStream} from "./nats-stream-connector";

const axios = require('axios');
const {connect, StringCodec, JSONCodec} = require("nats");
const sc = StringCodec();
const jc = JSONCodec();
let natsConnection: NatsConnection;

//Maintaining the subscription to perform operations on them
let subscriptionMap: Map<string, Subscription> = new Map<string, Subscription>();
let replyRequestMap: Map<string, string> = new Map<string, string>();

async function initConnection(natsConnectOptions: ConnectionOptions): Promise<NatsConnection | void> {
  try {
    console.log("Initializing connection to NATS server")
    natsConnection = await connect(natsConnectOptions);
    console.log(`connected to ${natsConnection.getServer()}`);
    (() => {

      let counter = 0;
      (async () => {
        for await (const s of natsConnection.status()) {
          counter++;
          console.info(`${counter} ${s.type}: ${JSON.stringify(s.data)}`);
        }
      })().then();
    })();

    return natsConnection;
  } catch (e) {
    console.log(e)
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
  console.log("Subscribing to " + subject)

  let subscription;
  try{
    subscription = natsConnection.subscribe(subject);
  }catch (e){
    console.log(e)
  }


  subscriptionMap.set(subject, subscription);
  if (!!requestSubject) {
    replyRequestMap.set(requestSubject, subject);
  }
  
  // Process incoming messages and respond if needed
  (async () => {
    for await (const m of subscription) {
      console.log(`[${subscription.getSubject()} - ${subscription.getProcessed()}]: ${sc.decode(m.data)}`);
      console.log(`Reply subject: ${m.reply}`);
      
      // If message has a reply subject, respond to it
      if (!!m.reply) {
        // Check if this is a request subject (ends with "request")
        if(subscription.getSubject().toLowerCase().endsWith("request")){
          const response = {
            "response": {
              "ok": "true",
              "status_code": 200,
              "content": JSON.stringify({"message": "You got served!!", "received": sc.decode(m.data)})
            },
            "error": null
          };
          m.respond(jc.encode(response));
          console.log(`Responded to request on ${subscription.getSubject()}`);
        } else {
          // Default response for other subjects
          const response = {
            "response": {
              "message": `Received message on ${subscription.getSubject()}`,
              "data": sc.decode(m.data)
            }
          };
          m.respond(jc.encode(response));
          console.log(`Responded to message on ${subscription.getSubject()}`);
        }
      }
    }
  })();
}

async function publishMessage(subject: string, message: any) {
  console.log("HERE YOU ARE PUBLISHING A MESSAGE")
  if (true) {
    // Math.ceil(Math.random()*1000).toString()
    const requestOptions = {
      timeout: 10000,
      noMux: true
    }

    console.log(message)

    return natsConnection.request(subject, !!message ? jc.encode(message): undefined, requestOptions).then(response => {
        // console.log(message + ' ::::: ' + jc.decode(response.data));
        console.log("Test")
        console.log(sc.decode(response.data))
        return {
          message: `Published message ${message} in topic ${subject} and received response`,
          response: sc.decode(response.data)
        }
      }).catch(e => {
        console.log(e)
        return {
          message: e
        }
      });
  } else {
    try{
      console.log(natsConnection.isClosed())
      natsConnection.publish(subject, jc.encode(message))
    } catch (e){
      console.log("12" + e)
    }
    return {
      message: `Published message in topic ${subject}`,
      response: null
    }
  }
}

export {initConnection, closeClientConnection, createSubscriber, publishMessage, addToRequestReplyMap};