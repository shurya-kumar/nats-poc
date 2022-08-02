import {
  AckPolicy,
  ConsumerInfo,
  JetStreamClient,
  Lister,
  NatsConnection,
  ReplayPolicy,
  RetentionPolicy,
  StorageType,
  StreamConfig,
} from "nats/lib/src/nats-base-client";
import {JetStreamManager, StreamInfo} from "nats/lib/nats-base-client/types";
import {StringCodec} from "nats";
import {ConsumerOptsBuilderImpl} from "nats/lib/nats-base-client/jsconsumeropts";
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

    // addStream("f067b90c-ceab-4a53-9002-4d39205c226f_stream", "test").then(res => {
    //   addDurableConsumer("f067b90c-ceab-4a53-9002-4d39205c226f_stream", "lol").then(res => {
    //     removeDurableConsumer("f067b90c-ceab-4a53-9002-4d39205c226f_stream", "lol").then(res => {
    //       removeStream("f067b90c-ceab-4a53-9002-4d39205c226f_stream")
    //     })
    //   })
    // })

    // addStream("f067b90c-ceab-4a53-9002-4d39205c226f_stream1", "test1").then(res => {
    //   addDurableConsumer("f067b90c-ceab-4a53-9002-4d39205c226f_stream1", "lol").then(res => {
    //     removeDurableConsumer("f067b90c-ceab-4a53-9002-4d39205c226f_stream1", "lol").then(res => {
    //       removeStream("f067b90c-ceab-4a53-9002-4d39205c226f_stream1")
    //     })
    //   })
    // })

    // publishMessageToStream("test", "test1")

    // jetStreamManager.consumers.list("junit").next().then(a => {
    //   console.log(a)
    // })
    // startConsumer().then(res => {
    //   console.log(res)
    // })

    // jetStreamManager.streams.delete("5d7154c9-e140-4d17-86b0-3fca75ae4c2e_stream").then(res => {
    //   console.log(res)
    // })

    // jetStreamManager.streams.list().next().then(res => {
    //   console.log(res[0].config)
    // })
    // jetStreamManager.consumers.info("aa8736a6-e36b-4829-a7f2-2cfd9281b556_stream", "244af421-5a39-4164-9531-8bfd75c0454d").then(res => {
    //   console.log(res)
    // })

    // jetStreamManager.streams.list().next().then(res => {
    //   console.log(res);
    // })

    // jetStreamClient.publish("hello",sc.encode("AD")).then(res => {
    //   console.log(res)
    // })
    // setInterval(function (){
    //   publishMessageToStream( {
    //     int: Math.random()
    //   }, "test")
    //
    //   publishMessageToStream( {
    //     date: new Date().toISOString()
    //   }, "case")
    //
    // },500)

    const streamConfig: Partial<StreamConfig> = {
      name: "junit",
      subjects: ["test","case"],
      retention: RetentionPolicy.Workqueue,
      max_consumers: 5,
      storage: StorageType.File,
      num_replicas: 1
    };

    // setInterval(function (){
    //   publishMessage("$JS.API.STREAM.CREATE.junit",streamConfig).then(res => {
    //     console.log(res)
    //   })
    // publishMessage("$JS.API.STREAM.INFO.paggu", null).then(res => {
    //   console.log(res)
    // })
    // },2000)

    // publishMessage("$JS.API.CONSUMER.INFO.test.world",null)



    // _________________CONSUMER TESTING_________________________


    // publishMessage("$JS.API.CONSUMER.DELETE.test.test",null);

    const consumerConfig = {
      "config": {
        "durable_name":"test",
        "ack_policy":"explicit",
        "filter_subject": "test"
      },
      "stream_name":"junit"
    }
    // publishMessage("$JS.API.CONSUMER.DURABLE.CREATE.junit.test",consumerConfig);

    const consumerConfig1 = {
      "config": {
        "durable_name":"case",
        "ack_policy":"explicit",
        "filter_subject": "case"
      },
      "stream_name":"junit"
    }
    // publishMessage("$JS.API.CONSUMER.DURABLE.CREATE.junit.case",consumerConfig1);



    // addDurableConsumer("nilesh", "nilesh");


    // setInterval(function (){
    //   jetStreamManager.streams.info("f4a0d235-f720-4e9e-83b4-89b9b17e7e1b_stream").then(res => {
    //     console.log(res.state.messages)
    //   });
    // },500)


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
    const cons = new ConsumerOptsBuilderImpl({
      ack_policy: AckPolicy.Explicit,
      replay_policy: ReplayPolicy.Instant,
      durable_name: "ayyo",

    })
    const psub = await jetStreamClient.pullSubscribe("test", cons);

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
      num_replicas: 3
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
    console.log("Publishing message")
    await jetStreamClient.publish(subject, sc.encode(message));
    console.log("Published message")
    return `Published message to stream on ${subject}`
  } catch (e){
    console.log("Error message")
    console.log(e);
    return `Failed to publish message to stream ${subject}`
  }
}

export {initStreamConnection, addStream, addDurableConsumer, publishMessageToStream, removeStream, removeDurableConsumer, findStreamBySubject}