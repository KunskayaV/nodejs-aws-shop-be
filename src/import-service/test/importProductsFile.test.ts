import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

import { handler } from '../src/handlers/importProductsFile';
import { ValidationError } from '../src/common/utils';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IMPORT_BUCKET_NAME, IMPORT_BUCKET_PREFIX } from '../src/common/constants';

// Mock AWS SDK methods
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('../src/common/utils', () => ({
  ...jest.requireActual('../src/common/utils'),
  logEvent: jest.fn(),
  createResponse: jest.fn((statusCode, body) => ({
    statusCode,
    body: JSON.stringify(body),
  })),
}));

describe('importProductsFile lambda handler', () => {
  const mockSignedUrl = 'https://signed-url.test';

  beforeEach(() => {
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: jest.fn(),
    }));
    (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);
  });

  it('should return a signed URL when "name" query parameter is provided', async () => {
    const fileName = 'test-file.csv';
    const event = {
      queryStringParameters: {
        name: fileName,
      },
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    /// Ensure S3Client is constructed
    expect(S3Client).toHaveBeenCalledTimes(1);

    // Ensure the response is as expected
    expect(response).toEqual({
      statusCode: StatusCodes.OK,
      body: JSON.stringify(mockSignedUrl),
    });
  });

  it("should throw ValidationError if 'name' query parameter is missing", async () => {
    const event = {} as unknown as APIGatewayProxyEventV2;

    await expect(handler(event)).rejects.toThrow(
      new ValidationError(
        'Filename if missing. Please provide it in query string as "name" parameter'
      )
    );
  });

  it('should handle errors in getSignedUrl gracefully', async () => {
    const event = {
      queryStringParameters: {
        name: 'test-file.csv',
      },
    } as unknown as APIGatewayProxyEventV2;

    (getSignedUrl as jest.Mock).mockRejectedValue(new Error('S3 Error'));

    await expect(handler(event)).rejects.toThrow('S3 Error');
  });
});