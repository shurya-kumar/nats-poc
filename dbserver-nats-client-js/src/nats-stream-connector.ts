import {
  consumerOpts,
  ConsumerOptsBuilder,
  createInbox,
  JetStreamClient,
  JetStreamSubscription,
  StringCodec
} from "nats";
import {NatsConnection} from "nats/lib/src/nats-base-client";

const sc = StringCodec();
let natsStreamConnection: NatsConnection;
let jetStreamClient: JetStreamClient;

async function initStreamConnection(nc: NatsConnection): Promise<boolean>{
  natsStreamConnection = nc;
  try{
    jetStreamClient = nc.jetstream();
    console.log("Created jetstream client")
    return true;
  } catch (e){
    console.log(e);
    return false;
  }
}

// TODO: Fix error
async function createStreamPushSubscriber(subject: string, durableName: string): Promise<void>{
  const opts: ConsumerOptsBuilder = consumerOpts();
  opts.durable(durableName);
  opts.manualAck();
  opts.deliverAll();
  opts.replayInstantly();
  opts.maxAckPending(1);

  let sub: JetStreamSubscription = await jetStreamClient.subscribe(subject, opts);
  await (async () => {
    for await (const m of sub) {
      console.log(`${m.info.stream}[${m.seq}]`);
      console.log(`${sc.decode(m.data)}`);
      if(sc.decode(m.data) != 'finish'){
        m.ack();
      }
    }
  })();
}

async function createPullConsumer(subject: string, durableName: string): Promise<string>{
  try{
    console.log("Creating Pull Consumer " + durableName);
    const psub = await jetStreamClient.pullSubscribe(subject, { config: { durable_name: durableName } });

    const done = (async () => {
      for await (const m of psub) {
        //start python
        console.log(sc.decode(m.data));
        m.ack();
      }
    })();

// To start receiving messages you pull the subscription
    psub.pull({ batch: 5, expires: 20000 });

    setInterval(() => {

      console.log("Interval kick")
      psub.pull({ batch: 5, expires: 20000 });

    }, 20000);

    return `Created pull customer with name ${durableName} for subject ${subject}`
  } catch (e){
    console.log(e)
    return `Failed to create pull customer with name ${durableName} for subject ${subject}`
  }
}

export {initStreamConnection, createStreamPushSubscriber, createPullConsumer}