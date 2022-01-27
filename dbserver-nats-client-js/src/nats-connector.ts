import {NatsConnection} from "nats/lib/src/nats-base-client";
import {Subscription} from "nats/lib/nats-base-client/types";
import {ConnectionOptions} from "nats";

const { connect, StringCodec } = require("nats");
const sc = StringCodec();
let natsConnection: NatsConnection;

//Maintaining the subscription to perform operations on them
let subscriptionMap: Map<string, Subscription> = new Map<string, Subscription>();
let replyRequestMap: Map<string, string> = new Map<string, string>();

async function initConnection(natsConOptions: ConnectionOptions): Promise<NatsConnection | void> {
  try{
    console.log("Initializing connection to NATS server")
    natsConnection = await connect(natsConOptions);
    console.log(`connected to ${natsConnection.getServer()}`);
    return natsConnection;
  } catch (e){
    console.log(e)
    console.log("Failed to connect to NATS Server");
    return;
  }
}

function addToRequestReplyMap(replySubject: string, requestSubject: string){
    replyRequestMap.set(requestSubject, replySubject);
}

function createSubscriber(subject: string){
  const subscription = natsConnection.subscribe(subject);
  subscriptionMap.set(subject, subscription);
  (async () => {
    for await (const m of subscription) {
      let response = {
        data: m.data
      }
      console.log(`[${ subscription.getSubject() } - ${ subscription.getProcessed() }]: ${ sc.decode(m.data) }`);
      if (!!m.reply) {
        // TODO: Construct API and hit the respective API
        let res = response.data + ' executed. Output generated: ' + new Date().toISOString();
        console.log(res)
        m.respond(sc.encode(res));
      }
    }
  })();
}

async function publishMessage(subject: string, message: any){
  if(replyRequestMap.has(subject)){
    const requestOptions = {
      timeout: 5000,
      noMux: true,
      reply: `${replyRequestMap.get(subject)}.${Math.ceil(Math.random() * 1000)}`
    }
    let response;
    try{
      response = await natsConnection.request(subject, sc.encode(message), requestOptions);
      return {
        message: `Published message in topic ${subject} and received response`,
        response: JSON.parse(sc.decode(response.data))
      }
    } catch (e){
      return {
        message: `Failed to fetch API response`,
        response: null
      }
    }
  } else {
    natsConnection.publish(subject, sc.encode(message))
    return {
      message: `Published message in topic ${subject}`,
      response: null
    }
  }
}

export { initConnection, createSubscriber, publishMessage, addToRequestReplyMap };