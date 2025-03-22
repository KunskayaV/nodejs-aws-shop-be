import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

import { randomUUID } from 'crypto';

import { createResponse, lambdaBaseErrorHandler, logEvent, ValidationError } from '../common/utils';
import { TCreateProductPayload } from '../common/types';
import { runValidationForProduct } from '../common/validators';
import { createItemInDBWithTransaction } from '../common/clients/DBClient';
import { getCreateProductTransactionItems } from '../common/clients/helpers';

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
  runValidationForProduct(product)

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
    const transactItems = getCreateProductTransactionItems({ ...sanitizedProduct, count })
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