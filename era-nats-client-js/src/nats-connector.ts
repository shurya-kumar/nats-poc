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

    // At request level
      const agent = new https.Agent({
        rejectUnauthorized: false
      });
      console.log(`[${subscription.getSubject()} - ${subscription.getProcessed()}]: ${sc.decode(m.data)}`);
      console.log(m.reply)
      // TODO: Parse the json object and make API call if request subject
      if (!!m.reply) {
        if(subscription.getSubject().toLowerCase() == "dbserver_registration"){
          let request = JSON.parse(sc.decode(m.data));
          console.log(request)
          axios.post("http://localhost:7000/add-stream", {
            stream: "dbserv1_stream",
            subject: `tenant1.${request.dbserver_uuid}.operations`
          }).then(streamS => {


            console.log("Created Stream");
            axios.post("http://localhost:7000/add-durable-customer", {
              stream: "dbserv1_stream",
              durableName: `${request.dbserver_uuid}`
            }).then(customerS => {


              m.respond(jc.encode({
                "cred": "eyJ0eXAiOiJKV1QiLCJhbGciOiJlZDI1NTE5LW5rZXkifQ.eyJqdGkiOiJJUlU1Sk1SQTdJNlBFNlJFRUpWNldHSUlTTFRGWE1CMlhFTUZFTEFERjU0UEZIQlNITU9RIiwiaWF0IjoxNjQ4NTU4MjAyLCJpc3MiOiJBREdCVjRBSFpUWUJQUDNTR05YQ1dVV0RCTUVEWDVIVDJIVE5KRTVVQ0ZHWFUyNVJCM1hEV0EzMyIsIm5hbWUiOiJ0ZXN0Iiwic3ViIjoiVURFWk9KMkJQVlFMSE9VS0lHQ1dURENMWFdGVk5IVEQ1RDZRNVFaQUpVNERJUjVSQ043WTdNRFMiLCJuYXRzIjp7InB1YiI6e30sInN1YiI6e30sInN1YnMiOi0xLCJkYXRhIjotMSwicGF5bG9hZCI6LTEsImJlYXJlcl90b2tlbiI6dHJ1ZSwidHlwZSI6InVzZXIiLCJ2ZXJzaW9uIjoyfX0.gat2NtcB-8uCJd1n1z0jli1Dtzd_gC5wMgO-3EHUuJPGib6fBppzd7u6Rac5TNmMFlbH8xncNLQd0ysJPAA6Aw",
                "tenant_id": "tenant1"
              }));
            })
          })

          // addStream("ops_stream", "test").then(streamSuccess => {
          //   console.log("Created stream");
          //   addDurableConsumer("ops_stream", ).then(consumerSuccess => {
          //     console.log("Created consumer");
          //
          //   });
          // });

        } else if(subscription.getSubject().toLowerCase().endsWith("request")){
          m.respond(jc.encode({
            "response": {
              "ok": "true",
              "status_code": 200,
              "content": JSON.stringify({"message": "You got served!!"})
            },
            "error": null
          }));
        } else {
          console.log("----------------")
          console.log(m.reply)
          m.respond(jc.encode({
            "response": {
              "Why": "PLEASE"
            }
          }))
        }

        // axios.get('https://10.50.89.68/era/v0.9/databases/count-summary',{
        //   httpsAgent: agent,
        //   headers: {
        //     Authorization: "Basic YWRtaW46TnV0YW5peC4x"
        //   }
        // })
        //   .then(response => {
        //     response.data.id = m.data + '-' + subscription.getSubject() + '-' + subscription.getProcessed();
        //     m.respond(jc.encode(JSON.stringify(response.data)))
        //   })
        //   .catch(error => {
        //     console.log(error);
        //   });
      }
    }
  })();
}

async function publishMessage(subject: string, message: any) {
  console.log("HERE YOU ARE PUBLISHING A MESSAGE")
  if (replyRequestMap.has(subject) || true) {
    // Math.ceil(Math.random()*1000).toString()
    const requestOptions = {
      timeout: 5000,
      reply: replyRequestMap.get(subject),
      noMux: true
    }

    message = {
      ...message,
      data: JSON.stringify(message.data)
    }
    console.log(message)

    return natsConnection.request(subject, !!message ? jc.encode(message): undefined, requestOptions).then(response => {
        // console.log(message + ' ::::: ' + jc.decode(response.data));
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
      natsConnection.publish(subject, sc.encode(message))
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