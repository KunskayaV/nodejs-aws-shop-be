import { TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { getCreateProductTransactionItems } from '../../src/common/clients/helpers';
import { PRODUCT_TABLE_NAME, STOCK_TABLE_NAME } from '../../src/common/constants';

jest.mock('../../src/common/constants', () => ({
  PRODUCT_TABLE_NAME: 'mockProductTable',
  STOCK_TABLE_NAME: 'mockStockTable',
}));

describe('getCreateProductTransactionItems', () => {
  it('should return a TransactWriteCommandInput with only a product item when count is not provided', () => {
    const product = {
      id: '123',
      title: 'Product Title',
      name: 'Test Product',
      price: 100,
    };

    const expectedOutput: TransactWriteCommandInput = {
      TransactItems: [
        {
          Put: {
            TableName: PRODUCT_TABLE_NAME,
            Item: product,
            ConditionExpression: 'attribute_not_exists(id)',
          },
        },
      ],
    };

    const result = getCreateProductTransactionItems(product);
    expect(result).toEqual(expectedOutput);
  });

  it('should return a TransactWriteCommandInput with product and stock items when count is provided', () => {
    const product = {
      id: '123',
      title: 'Product Title',
      name: 'Test Product',
      price: 100,
      count: 10,
    };

    const expectedOutput: TransactWriteCommandInput = {
      TransactItems: [
        {
          Put: {
            TableName: PRODUCT_TABLE_NAME,
            Item: product,
            ConditionExpression: 'attribute_not_exists(id)',
          },
        },
        {
          Put: {
            TableName: STOCK_TABLE_NAME,
            Item: {
              product_id: '123',
              count: 10,
            },
            ConditionExpression: 'attribute_not_exists(product_id)',
          },
        },
      ],
    };

    const result = getCreateProductTransactionItems(product);
    expect(result).toEqual(expectedOutput);
  });
});