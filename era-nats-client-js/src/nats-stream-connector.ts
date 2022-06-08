import {
  AckPolicy, ConsumerInfo,
  JetStreamClient, Lister,
  NatsConnection,
  RetentionPolicy,
  StorageType,
  StreamConfig,
} from "nats/lib/src/nats-base-client";
import {JetStreamManager, StreamInfo} from "nats/lib/nats-base-client/types";
import {StringCodec} from "nats";
import {publishMessage} from "./nats-connector";

const sc = StringCodec();
const jc = StringCodec();
let natsStreamConnection: NatsConnection;
let jetStreamManager: JetStreamManager;
let jetStreamClient: JetStreamClient;

async function initStreamConnection(nc: NatsConnection): Promise<boolean>{
  natsStreamConnection = nc;
  try{
    jetStreamManager = await nc.jetstreamManager();
    jetStreamClient = nc.jetstream();
    // setInterval(function (){
    //   publishMessage("1cabbbb8-29a6-4677-869a-a841a1542c34.e06223ec-5ab8-499d-aea6-640dc4253a52.operations", "POWERFULL")
    // },2000)

    const streamConfig: Partial<StreamConfig> = {
      name: "nilesh",
      subjects: ["nilesh"],
      retention: RetentionPolicy.Workqueue,
      max_consumers: 5,
      storage: StorageType.File,
      num_replicas: 1
    };

    // setInterval(function (){
      publishMessage("JS.ea9f94fc-a846-4184-add2-c98f4ce31046.STREAM.CREATE.nilesh",streamConfig).then(res => {
        publishMessage("JS.ea9f94fc-a846-4184-add2-c98f4ce31046.STREAM.DELETE.nilesh",null);
      })
    // },2000)





    // _________________CONSUMER TESTING_________________________

    const consumerConfig = {
      "config": {
        "durable_name":"nilesh",
        "ack_policy":"explicit"
      },
      "stream_name":"nilesh"
    }
    // publishMessage("JS.e7a2e0f9-cd2e-4097-b1ce-226beca62847.STREAM.INFO.nilesh", null)
    // publishMessage("$JS.API.CONSUMER.DURABLE.CREATE.qwerty_stream.qwerty",consumerConfig)

    // addDurableConsumer("nilesh", "nilesh");


    // jetStreamManager.streams.list().next().then(res => {
    //   console.log(res);
    // })

    // jetStreamManager.streams.info("pragna").then(res => {
    //   console.log(res)
    // });


    // setInterval(function (){
    //   jetStreamManager.streams.info("8deab2d5-d04c-4ce7-a109-95dcff127afc_stream").then(res => {
    //     console.log("Stream Info")
    //     console.log(res)
    //     console.log("Stream INFO COMPLETE")
    //   })
    // },2000)

    // jetStreamManager.streams.delete("8deab2d5-d04c-4ce7-a109-95dcff127afc_stream").then(res => {
    //   console.log("Deleted stream " + res)
    // })

   // setInterval(function (){
   //   jetStreamManager.consumers.info("orchestrator_stream","orchestrator_durable").then(response => {
   //     console.log("Consumer Info")
   //     console.log(response)
   //     console.log("")
   //   });

    // addDurableConsumer("orchestrator_stream","orchestrator_durable")
    // addStream("help","test");

   // }, 20000)

    // startConsumer();

    // setInterval(function (){
    //
    // }, 5000)


    // setTimeout(function () {
    //   startConsumer();
    // }, 10000)


    console.log("Created jetstream manager and client")
    return true;
  } catch (e){
    console.log(e);
    return false;
  }
}

async function startConsumer() {
  try{
    console.log("Creating Pull Consumer");
    const psub = await jetStreamClient.pullSubscribe("orchestrator.operations", {
      config: { durable_name: "orchestrator_durable" }
    });

    const done = (async () => {
      for await (const m of psub) {
        //start python
        console.log(sc.decode(m.data));
        m.ack();
      }
    })();

// To start receiving messages you pull the subscription
    psub.pull({ batch: 5, expires: 20000, });

    setInterval(() => {

      console.log("Interval kick")
      psub.pull({ batch: 5, expires: 20000 });

    }, 20000);

    // return `Created pull customer with name ${durableName} for subject ${subject}`
  } catch (e){
    console.log(e)
    // return `Failed to create pull customer with name ${durableName} for subject ${subject}`
  }
}

async function addStream(streamName: string, subject: string): Promise<string>{
  try{
    const streamConfig: Partial<StreamConfig> = {
      name: streamName,
      subjects: [subject],
      retention: RetentionPolicy.Workqueue,
      max_consumers: 5,
      storage: StorageType.File,
      num_replicas: 1
    };
    const streamInfo: StreamInfo = await jetStreamManager.streams.add(streamConfig);
    return `Created stream with name ${streamName} and subject ${subject} on ${streamInfo.created}`
  } catch (e){
    console.log(e);
    return `Failed to create a stream ${streamName}`;
  }
}

async function findStreamBySubject(subject: string, stream: string): Promise<string>{
  // let test = await jetStreamManager.streams.find(subject);
  // console.log(test)
  let list: Lister<StreamInfo> = jetStreamManager.streams.list();
  let streams:StreamInfo[] = await list.next();
  streams.forEach(s => {
    console.log(s.config.name)
    console.log(s.config.subjects)
  })
  let consumerList: Lister<ConsumerInfo> = jetStreamManager.consumers.list(stream);
  let consumers: ConsumerInfo[] = await consumerList.next();
  consumers.forEach(c => {
    console.log(c)
    console.log(c.stream_name)
  })
  return "Done"
}

async function removeStream(streamName: string): Promise<string>{
  const errMsg = `Failed to delete stream ${streamName}`;
  try{
    const isStreamDeleted: boolean = await jetStreamManager.streams.delete(streamName);
    if(isStreamDeleted){
      return `Deleted stream ${streamName} successfully`
    }
    return errMsg;
  } catch (e){
    console.log(e);
    return errMsg;
  }
}

async function addDurableConsumer(stream: string, durableName: string): Promise<string>{
  try{
    const consumerInfo: ConsumerInfo = await jetStreamManager.consumers.add(stream, {
      durable_name: durableName,
      ack_policy: AckPolicy.Explicit
    });
    if(consumerInfo.created){
      return `Successfully created durable consumer ${durableName} to stream ${stream}`
    } else {
      throw "Failed to add durable consumer";
    }
  }catch (e){
    console.log(e);
    return `Failed to add durable consumer ${durableName} to stream ${stream}`
  }
}

async function removeDurableConsumer(stream: string, durableName: string): Promise<string>{
  const errMsg: string = `Failed to delete durable consumer ${durableName} from stream ${stream}`;
  try{
    const isCustomerDeleted: boolean = await jetStreamManager.consumers.delete(stream, durableName);
    if(isCustomerDeleted){
      return `Successfully deleted durable consumer ${durableName} from stream ${stream}`
    }
    return errMsg;
  } catch (e){
    console.log(e);
    return errMsg;
  }
}

async function publishMessageToStream(message, subject){
  try{
    await jetStreamClient.publish(subject, sc.encode(JSON.stringify(message)));
    return `Published message to stream on ${subject}`
  } catch (e){
    console.log(e);
    return `Failed to publish message to stream ${subject}`
  }
}

export {initStreamConnection, addStream, addDurableConsumer, publishMessageToStream, removeStream, removeDurableConsumer, findStreamBySubject}