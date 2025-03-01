import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { StatusCodes } from 'http-status-codes';

import { handler } from '../src/handlers/createNewProduct';

import { validateProduct } from '../src/common/validators';
import { createItemInDBWithTransaction } from '../src/common/clients/DBClient';
import { ValidationError } from '../src/common/utils';
import { baseHeaders } from '../src/common/constants';

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid')
}));
jest.mock('../src/common/validators');
jest.mock('../src/common/clients/DBClient');

describe('createNewProduct handler', () => {
  const productData = {
    title: "New Product",
    description: "Description of the new product",
    price: 100,
    count: 10
  };

  const event: APIGatewayProxyEventV2 = {
    body: JSON.stringify(productData)
  } as APIGatewayProxyEventV2;

  it('should create a product with transaction', async () => {
    (validateProduct as jest.Mock).mockImplementation(() => true);
    (createItemInDBWithTransaction as jest.Mock).mockResolvedValue(true);

    const response = await handler(event);

    expect(validateProduct).toHaveBeenCalledWith(productData);
    expect(createItemInDBWithTransaction).toHaveBeenCalledWith(expect.anything());
    expect(response).toEqual({
      statusCode: StatusCodes.CREATED,
      headers: baseHeaders,
      body: JSON.stringify({
        id: 'test-uuid',
        title: "New Product",
        description: "Description of the new product",
        price: 100,
        count: 10
      })
    });
  });

  it('should throw ValidationError if event body is missing', async () => {
    const badEvent = {} as APIGatewayProxyEventV2;

    await expect(handler(badEvent)).rejects.toThrowError(new ValidationError('Request body is missing.'));
  });

  it('should throw ValidationError if JSON is invalid', async () => {
    const badEvent = {
      body: 'not a json string'
    } as APIGatewayProxyEventV2;

    await expect(handler(badEvent)).rejects.toThrowError(new ValidationError('Invalid JSON.'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});