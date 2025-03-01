import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

import { handler } from '../src/handlers/getProductsList';

import { getItemsFromDB } from '../src/common/clients/DBClient';
import { baseHeaders, PRODUCT_TABLE_NAME, STOCK_TABLE_NAME } from '../src/common/constants';

jest.mock('../src/common/clients/DBClient');

describe('getProductsList handler', () => {
  const products = [
    { id: '1', title: 'Product 1', price: 20 },
    { id: '2', title: 'Product 2', price: 30 }
  ];
  const stock = [
    { product_id: '1', count: 10 },
    { product_id: '2', count: 20 }
  ];

  beforeAll(() => {
    (getItemsFromDB as jest.Mock)
      .mockImplementation((params) => {
        if (params.TableName === PRODUCT_TABLE_NAME) {
          return Promise.resolve(products);
        } else if (params.TableName === STOCK_TABLE_NAME) {
          return Promise.resolve(stock);
        }
        return Promise.resolve([]);
      });
  });

  it('should return products list with stock count', async () => {
    const event = {} as APIGatewayProxyEventV2;
    const response = await handler(event);

    expect(getItemsFromDB).toHaveBeenCalledTimes(2);
    expect(getItemsFromDB).toHaveBeenCalledWith({ TableName: PRODUCT_TABLE_NAME, ConsistentRead: true });
    expect(getItemsFromDB).toHaveBeenCalledWith({ TableName: STOCK_TABLE_NAME, ConsistentRead: true });
    expect(response).toEqual({
      statusCode: StatusCodes.OK,
      headers: baseHeaders,
      body: JSON.stringify([
        { id: '1', title: 'Product 1', price: 20, count: 10 },
        { id: '2', title: 'Product 2', price: 30, count: 20 }
      ])
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});