import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SNS_TOPIC_ARN } from "../constants";
import { logEvent } from "../utils";


const snsClient = new SNSClient();

export async function sendSNSNotification(products: any[]) {
  try {
    // Send individual notification for each product
    for (const product of products) {
      const command = new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: 'New Product Created',
        Message: JSON.stringify({
          message: 'New product created',
          product: product
        }, null, 2),
        MessageAttributes: {
          'price': {
            DataType: 'Number',
            StringValue: product.price.toString()
          },
          'title': {
            DataType: 'String',
            StringValue: product.title
          },
          'count': {
            DataType: 'Number',
            StringValue: product.count.toString()
          }
        }
      });

      await snsClient.send(command);
      logEvent(`SNS notification sent successfully for product: ${product.id}`, 'SNS Client');
    }
  } catch (error) {
    console.error('Error sending SNS notification:', error);
    throw error;
  }
}