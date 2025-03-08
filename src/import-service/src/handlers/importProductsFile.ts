import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

import { createResponse, lambdaBaseErrorHandler, logEvent, ValidationError } from '../common/utils';
import { IMPORT_BUCKET_NAME, IMPORT_BUCKET_PREFIX } from '../common/constants';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const { queryStringParameters} = event;

  // Check if 'name' query parameter exists
  if (!queryStringParameters?.name) {
    throw new ValidationError('Filename if missing. Please provide it in query string as "name" parameter');
  }

  logEvent(`importProductsFile is called with name: ${JSON.stringify(queryStringParameters.name)}.`);

  const { name: fileName } = queryStringParameters;

  const s3Params = {
    Bucket: IMPORT_BUCKET_NAME,
    Key: `${IMPORT_BUCKET_PREFIX}/${fileName}`,
    expires: 60,
  };

  const s3Client = new S3Client();
  const signedUrl = await getSignedUrl(s3Client, new PutObjectCommand(s3Params), { expiresIn: 60 }); 

  // Return the created product with count
  return createResponse(
    StatusCodes.OK,
    signedUrl,
  );
}

export const lambdaHandler = lambdaBaseErrorHandler(handler);