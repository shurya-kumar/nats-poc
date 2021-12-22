import {
  AckPolicy, ConsumerInfo,
  JetStreamClient,
  NatsConnection,
  RetentionPolicy,
  StorageType,
  StreamConfig,
} from "nats/lib/src/nats-base-client";
import {JetStreamManager, StreamInfo} from "nats/lib/nats-base-client/types";
import {StringCodec} from "nats";

const sc = StringCodec();
let natsStreamConnection: NatsConnection;
let jetStreamManager: JetStreamManager;
let jetStreamClient: JetStreamClient;

async function initStreamConnection(nc: NatsConnection): Promise<boolean>{
  natsStreamConnection = nc;
  try{
    jetStreamManager = await nc.jetstreamManager();
    jetStreamClient = nc.jetstream();
    console.log("Created jetstream manager and client")
    return true;
  } catch (e){
    console.log(e);
    return false;
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
      num_replicas: 2
    };
    console.log(streamConfig)
    const streamInfo: StreamInfo = await jetStreamManager.streams.add(streamConfig);
    return `Created stream with name ${streamName} and subject ${subject} on ${streamInfo.created}`
  } catch (e){
    console.log(e);
    return `Failed to create a stream ${streamName}`;
  }
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
      ack_policy: AckPolicy.Explicit,
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
    await jetStreamClient.publish(subject, sc.encode(message));
    return `Published message to stream on ${subject}`
  } catch (e){
    console.log(e);
    return `Failed to publish message to stream ${subject}`
  }
}

export {initStreamConnection, addStream, addDurableConsumer, publishMessageToStream, removeDurableConsumer}