import {
  GetQueueUrlCommand,
  SQSClient,
  SendMessageBatchCommand,
  SendMessageBatchRequestEntry 
 } from '@aws-sdk/client-sqs';

import { logEvent } from "../utils";
import { randomUUID } from 'crypto';
import { SQS_NAME } from '../constants';

class LocalSQSClient {
  private sqsClient: SQSClient;
  private sqsQueueUrl: string;

  constructor() {
    this.sqsClient = new SQSClient();
    this.sqsQueueUrl = '';
  }

  async initialize() {
    const command = new GetQueueUrlCommand({ QueueName: SQS_NAME });
    
    const { QueueUrl }  = await this.sqsClient.send(command);

    this.sqsQueueUrl = QueueUrl || '';
  }

  generateSQSMessage(body: any) {
    return {
      Id: randomUUID(),
      MessageBody: JSON.stringify(body)
    }
  }

  async sendBatchOfMessagesToSQS(records: SendMessageBatchRequestEntry[]) {
    logEvent(`sendBatchOfMessagesToSQS records: ${JSON.stringify(records)}`, 'SQSClient');

    await this.sqsClient.send(new SendMessageBatchCommand({
      QueueUrl: this.sqsQueueUrl,
      Entries: records
    }));
  }
}

const client = new LocalSQSClient();

export default client;
