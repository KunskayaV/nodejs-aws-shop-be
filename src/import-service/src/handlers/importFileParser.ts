import { APIGatewayProxyResultV2, S3Event } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

import csv from 'csv-parser';
import { Readable } from 'stream';
import { createResponse, lambdaBaseErrorHandler, logEvent } from '../common/utils';
import { IMPORT_BUCKET_PREFIX } from '../common/constants';

export const handler = async (event: S3Event): Promise<APIGatewayProxyResultV2> => {
  logEvent(`importProductsFile is invoked by: ${JSON.stringify(event.Records)}.`);

  const bucketName = event.Records[0].s3.bucket.name;
  const recordKey = event.Records[0].s3.object.key;

  const key = decodeURIComponent(recordKey.replace(/\+/g, ' '));
  logEvent(`File URL: ${key}.`);

  const s3Params = {
    Bucket: bucketName,
    Key: key,
  };

  const s3Client = new S3Client();
  
  try {
    // Get the object from S3
    const { Body } = await s3Client.send(
      new GetObjectCommand(s3Params)
    );

    if (Body instanceof Readable) {
      // Process the CSV file
      await new Promise((resolve, reject) => {
        Body.pipe(csv())
          .on('data', (record) => {
            // Log each record from CSV
            logEvent(`Parsed CSV record: ${JSON.stringify(record)}`);
          })
          .on('error', (error) => {
            console.error('Error parsing CSV:', error);
            reject(error);
          })
          .on('end', async () => {
            logEvent('Finished processing CSV file');

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

    return createResponse(
      StatusCodes.OK,
      { message: 'File is processed successfully' }
    );
  } catch (error) {
    console.error('Error processing S3 object:', error);
    throw error;
  }
}

export const lambdaHandler = lambdaBaseErrorHandler(handler);