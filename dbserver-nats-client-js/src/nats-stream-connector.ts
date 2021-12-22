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
async function createStreamPushSubscriber(durableName: string, subject: string): Promise<void>{
  const opts: ConsumerOptsBuilder = consumerOpts();
  opts.durable(durableName);
  opts.manualAck();
  opts.ackExplicit();
  opts.deliverTo(createInbox());

  let sub: JetStreamSubscription = await jetStreamClient.subscribe(subject, opts);
  console.log(sub.getSubject());
  console.log(sub.getID());
  await (async () => {
    for await (const m of sub) {
      m.ack();
      console.log(sc.decode(m.data))
    }
  })();
}

async function createPullConsumer(subject: string, durableName: string): Promise<string>{
  try{
    const psub = await jetStreamClient.pullSubscribe(subject, { config: { durable_name: durableName } });
    const done = (async () => {
      for await (const m of psub) {
        console.log(`${m.info.stream}[${m.seq}]`);
        console.log(`${sc.decode(m.data)}`);
        m.ack();
      }
    })();

// To start receiving messages you pull the subscription
    setInterval(() => {
      psub.pull({ batch: 1, expires: 2000 });
    }, 2000);

    return `Created pull customer with name ${durableName} for subject ${subject}`
  } catch (e){
    return `Failed to create pull customer with name ${durableName} for subject ${subject}`
  }
}

export {initStreamConnection, createStreamPushSubscriber, createPullConsumer}