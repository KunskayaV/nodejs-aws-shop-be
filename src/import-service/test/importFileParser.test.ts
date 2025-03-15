import { S3Event, S3EventRecord } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  GetQueueUrlCommand,
  SQSClient,
  SendMessageBatchCommand,
  SendMessageBatchRequestEntry 
 } from '@aws-sdk/client-sqs';
import { Readable } from 'stream';

import { handler } from '../src/handlers/importFileParser';
import { IMPORT_BUCKET_PREFIX } from '../src/common/constants';
import { logEvent } from '../src/common/utils';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-sqs');
jest.mock('../src/common/utils', () => ({
  ...jest.requireActual('../src/common/utils'),
  logEvent: jest.fn(),
  createResponse: jest.fn((statusCode, body) => ({
    statusCode,
    body: JSON.stringify(body),
  })),
}));

describe('importFileParser handler', () => {
  const mockStream = new Readable();
  mockStream._read = () => {};
  mockStream.push(`\
  title,description,price,count\n\
  Product1,Description for Product1,100,12\n\
  Product2,Description for Product2,200,10\n`);
  mockStream.push(null); // End of CSV stream

  const bucketName = 'test-bucket';
  const recordKey = `${IMPORT_BUCKET_PREFIX}/test.csv`;

  const s3Event: S3Event = {
    Records: [
      {
        s3: {
          bucket: {
            name: bucketName,
          },
          object: {
            key: recordKey,
          },
        },
      } as S3EventRecord,
    ],
  };

  const QueueUrl = 'QueueUrl';

  beforeEach(() => {
    // Mock S3Client.send()
    S3Client.prototype.send = jest.fn((command) => {
      if (command instanceof GetObjectCommand) {
        // Mock GetObjectCommand to return a simulated Readable CSV file body
        return Promise.resolve({ Body: mockStream });
      } else if (command instanceof CopyObjectCommand) {
        // Mock CopyObjectCommand to succeed
        return Promise.resolve();
      } else if (command instanceof DeleteObjectCommand) {
        // Mock DeleteObjectCommand to succeed
        return Promise.resolve();
      }
      return Promise.reject(new Error('Unknown command'));
    });
    // Mock SQSClient.send()
    SQSClient.prototype.send = jest.fn((command) => {
      if (command instanceof GetQueueUrlCommand) {
        // Mock GetObjectCommand to return a simulated Readable CSV file body
        return Promise.resolve({ QueueUrl });
      } else if (command instanceof SendMessageBatchCommand) {
        // Mock CopyObjectCommand to succeed
        return Promise.resolve();
      }
      return Promise.reject(new Error('Unknown command'));
    });
  });

  it('should process the CSV file, copy it to the "parsed" folder, and delete the original file', async () => {
    const response = await handler(s3Event);

    // Assertions for S3Client operations
    expect(S3Client.prototype.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    expect(S3Client.prototype.send).toHaveBeenCalledWith(expect.any(CopyObjectCommand));
    expect(S3Client.prototype.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));


    expect(SQSClient.prototype.send).toHaveBeenCalledWith(expect.any(GetQueueUrlCommand));
    expect(SQSClient.prototype.send).toHaveBeenCalledWith(expect.any(SendMessageBatchCommand));

    // Assertions for response
    expect(logEvent).toHaveBeenCalledWith('File is processed successfully');
  });

  it('should throw an error if the CSV file is invalid', async () => {
    // Mock invalid CSV data
    const invalidStream = new Readable();
    invalidStream._read = () => {};
    invalidStream.push('invalid-data');
    invalidStream.push(null);

    S3Client.prototype.send = jest.fn((command) => {
      if (command instanceof GetObjectCommand) {
        return Promise.resolve({ Body: invalidStream });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    await handler(s3Event);

    expect(logEvent).toHaveBeenCalledWith(`Error processing file: Error: Unknown command`);
  });

  it('should throw an error if S3 GetObjectCommand fails', async () => {
    S3Client.prototype.send = jest.fn((command) => {
      if (command instanceof GetObjectCommand) {
        return Promise.reject(new Error('S3 GetObjectCommand failed'));
      }
      return Promise.resolve();
    });

    await handler(s3Event);

    expect(logEvent).toHaveBeenCalledWith(`Error processing file: Error: S3 GetObjectCommand failed`);
  });
});