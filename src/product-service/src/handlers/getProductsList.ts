import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

import { createResponse, lambdaBaseErrorHandler, logEvent } from '../common/utils';
import { PRODUCT_TABLE_NAME, STOCK_TABLE_NAME } from '../common/constants';
import { TProduct, TStockInfo } from '../common/types';
import { getItemsFromDB } from '../common/clients/DBClient';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  logEvent('getProductsList is called');

  const productParams = {
    TableName: PRODUCT_TABLE_NAME,
    ConsistentRead: true,
  };
  const stockParams = {
    TableName: STOCK_TABLE_NAME,
    ConsistentRead: true,
  };

  const products = await getItemsFromDB<TProduct>(productParams);
  const stock = await getItemsFromDB<TStockInfo>(stockParams);

  const productsWithCount = products.map(product => {
    const productCount = stock.find(stockInfo => product.id === stockInfo.product_id);

    return {
      ...product,
      count: productCount?.count || 0
    }
  })

  return createResponse(
    StatusCodes.OK,
    productsWithCount
  );
}

export const lambdaHandler = lambdaBaseErrorHandler(handler);
