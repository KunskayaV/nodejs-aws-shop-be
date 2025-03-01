import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

import { createResponse, lambdaBaseErrorHandler, logEvent, NotFoundError, ValidationError } from '../common/utils';
import { PRODUCT_TABLE_NAME, STOCK_TABLE_NAME } from '../common/constants';
import { getItemFromDB } from '../common/clients/DBClient';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const productId = event.pathParameters?.productId;

  if (!productId) {
    throw new ValidationError("The 'productId' path parameter is required.");
  }

  logEvent(`getProductById is called with id: ${JSON.stringify(productId)}.`);

  const productParams = {
    TableName: PRODUCT_TABLE_NAME,
    Key: {
      id: productId,
    },
  };
  const stockParams = {
    TableName: STOCK_TABLE_NAME,
    Key: {
      product_id: productId,
    },
  };

  const productById = await getItemFromDB(productParams);
  const stockProductInfo = await getItemFromDB(stockParams);

  if (!productById) {
    throw new NotFoundError(`The product with provided product id ${productId} is not found.`);
  }

  return createResponse(
    StatusCodes.OK,
    {
      ...productById,
      count: stockProductInfo?.count || 0
    }
  );
}

export const lambdaHandler = lambdaBaseErrorHandler(handler);