import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { handler } from '../src/handlers/getProductById';
import { getItemFromDB } from '../src/common/clients/DBClient';
import { ValidationError, NotFoundError } from '../src/common/utils';
import { baseHeaders, PRODUCT_TABLE_NAME, STOCK_TABLE_NAME } from '../src/common/constants';

jest.mock('../src/common/clients/DBClient');

describe('getProductById handler', () => {
  const productId = '1234';

  it('should return product details and stock count', async () => {
    const productById = { id: productId, name: 'Awesome Product' };
    const stockProductInfo = { count: 10 };

    (getItemFromDB as jest.Mock)
      .mockReturnValueOnce(Promise.resolve(productById))
      .mockReturnValueOnce(Promise.resolve(stockProductInfo));

    const event = {
      pathParameters: { productId }
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(getItemFromDB).toHaveBeenCalledWith({
      TableName: PRODUCT_TABLE_NAME,
      Key: { id: productId }
    });
    expect(getItemFromDB).toHaveBeenCalledWith({
      TableName: STOCK_TABLE_NAME,
      Key: { product_id: productId }
    });
    expect(response).toEqual({
      statusCode: StatusCodes.OK,
      headers: baseHeaders,
      body: JSON.stringify({ ...productById, count: stockProductInfo.count })
    });
  });

  it('should throw ValidationError if productId is missing', async () => {
    const event = { pathParameters: {} } as unknown as APIGatewayProxyEventV2;

    await expect(handler(event)).rejects.toThrow(ValidationError);
  });

  it('should throw NotFoundError if product is not found', async () => {
    (getItemFromDB as jest.Mock)
      .mockReturnValueOnce(Promise.resolve(null));

    const event = {
      pathParameters: { productId }
    } as unknown as APIGatewayProxyEventV2;

    await expect(handler(event)).rejects.toThrow(new NotFoundError(`The product with provided product id ${productId} is not found.`));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});