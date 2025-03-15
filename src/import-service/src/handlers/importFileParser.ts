import { APIGatewayProxyResultV2, S3Event } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

import csv from 'csv-parser';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {  SendMessageBatchCommand, SendMessageBatchRequestEntry } from '@aws-sdk/client-sqs';
import { logEvent } from '../common/utils';
import sqsClient from '../common/clients/SQSClient';
import { IMPORT_BUCKET_PREFIX, SQS_PROCESSING_BATCH_SIZE } from '../common/constants';

const s3Client = new S3Client();

export const handler = async (event: S3Event): Promise<void> => {
  logEvent(`importFileParser is invoked by: ${JSON.stringify(event.Records)}.`);
  try {
    const bucketName = event.Records[0].s3.bucket.name;
    const recordKey = event.Records[0].s3.object.key;

    const key = decodeURIComponent(recordKey.replace(/\+/g, ' '));
    logEvent(`File URL: ${key}.`);

    const s3Params = {
      Bucket: bucketName,
      Key: key,
    };

    await sqsClient.initialize();
  
    // Get the object from S3
    const { Body } = await s3Client.send(
      new GetObjectCommand(s3Params)
    );

    if (Body instanceof Readable) {
      let records: SendMessageBatchRequestEntry[] = [];
      // Process the CSV file
      await new Promise((resolve, reject) => {
        Body.pipe(csv())
          .on('data', async (record) => {
            records.push(
              sqsClient.generateSQSMessage({
                ...record,
                price: parseFloat(record.price),
                count: parseInt(record.count || 0, 10)
              })
            );

            // Send batch of messages to SQS
            if (records.length === SQS_PROCESSING_BATCH_SIZE) {
              try {
                await sqsClient.sendBatchOfMessagesToSQS(records);

                records = []; // Clear the batch after sending
              } catch (error) {
                console.error('Error sending messages to SQS:', error);
                reject(error);
              }
            }
            // Log each record from CSV
            logEvent(`Parsed CSV record: ${JSON.stringify(record)}`);
          })
          .on('error', (error) => {
            console.error('Error parsing CSV:', error);
            reject(error);
          })
          .on('end', async () => {
            if (records.length > 0) {
              try {
                await sqsClient.sendBatchOfMessagesToSQS(records)

              } catch (error) {
                console.error('Error sending final batch to SQS:', error);
                reject(error);
              }
            }

            resolve(null);
          });
      }).catch(error => { throw error; });

      await s3Client.send(new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${recordKey}`,
        Key: recordKey.replace(IMPORT_BUCKET_PREFIX, 'parsed'),
      }));

      logEvent(`File ${recordKey} is copied into "parsed" folder`);

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: recordKey,
        }),
      );

      logEvent(`File ${recordKey} is removed from ${IMPORT_BUCKET_PREFIX} folder`);
    }

    logEvent('File is processed successfully');
  } catch (error) {
    logEvent(`Error processing file: ${error}`);
  }
}

export const lambdaHandler = handler;