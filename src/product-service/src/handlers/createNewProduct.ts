import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { StatusCodes } from 'http-status-codes';

import { randomUUID } from 'crypto';

import { createResponse, lambdaBaseErrorHandler, logEvent, ValidationError } from '../common/utils';
import { PRODUCT_TABLE_NAME, STOCK_TABLE_NAME } from '../common/constants';
import { TCreateProductPayload } from '../common/types';
import { validateProduct } from '../common/validators';
import { createItemInDBWithTransaction } from '../common/clients/DBClient';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  // Check if body exists
  if (!event.body) {
    throw new ValidationError('Request body is missing.');
  }

  // Parse and validate the input
  let product: TCreateProductPayload;
  try {
    product = JSON.parse(event.body);
  } catch (error) {
    throw new ValidationError('Invalid JSON.');
  }

  logEvent(`createNewProduct is called with body: ${JSON.stringify(event.body)}.`);

  // Validate the product data
  try {
    validateProduct(product);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Product validation failed');
  }

  const id = randomUUID();

  // Sanitize the input
  const sanitizedProduct = {
    id,
    title: product.title.trim(),
    description: product.description?.trim() || '',
    price: product.price,
  };

  const count = product.count !== undefined ? product.count : 0;

  try {
    // Create TransactWrite operation
    const transactItems: TransactWriteCommandInput = {
      TransactItems: [
        {
          Put: {
            TableName: PRODUCT_TABLE_NAME,
            Item: sanitizedProduct,
            // Ensure the item doesn't already exist
            ConditionExpression: 'attribute_not_exists(id)'
          }
        }
      ]
    };

    if (count) {
      transactItems.TransactItems?.push({
        Put: {
          TableName: STOCK_TABLE_NAME,
          Item: {
            product_id: id,
            count
          },
          // Ensure the item doesn't already exist
          ConditionExpression: 'attribute_not_exists(product_id)'
        }
      });
    }

    await createItemInDBWithTransaction(transactItems);

    // Return the created product with count
    return createResponse(
      StatusCodes.CREATED,
      {
        ...sanitizedProduct,
        count
      }
    );
  } catch (error) {
    logEvent(`Transaction failed: ${error}`);
    throw new Error('Failed to create product with stock');
  }
}

export const lambdaHandler = lambdaBaseErrorHandler(handler);