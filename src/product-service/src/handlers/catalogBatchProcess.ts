import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import { randomUUID } from 'crypto';

import { logEvent } from '../common/utils';
import { createItemInDBWithTransaction } from '../common/clients/DBClient';
import { getCreateProductTransactionItems } from '../common/clients/helpers';
import { runValidationForProduct } from '../common/validators';
import { sendSNSNotification } from '../common/clients/SNSClient';


export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  logEvent(`catalogBatchProcess lambda processing SQS batch event:: ${JSON.stringify(event)}.`);

  const batchItemFailures: SQSBatchItemFailure[] = [];
  const processedProducts = [];

  for (const record of event.Records) {
    try {
      const processedProduct = await processRecord(record);
      processedProducts.push(processedProduct);
    } catch (error) {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  if (processedProducts.length) {
    // Send notification about processed products
    await sendSNSNotification(processedProducts);
  }

  logEvent(
    batchItemFailures.length > 0
      ?`Batch is processed with failures: ${JSON.stringify(batchItemFailures)}`
      : 'Batch is successfully processed'
  );

  return { batchItemFailures };
}

async function processRecord(record: SQSRecord) {
  try {
    logEvent(`Processing product: ${record.body}`);

    const productData = JSON.parse(record.body);

    runValidationForProduct(productData);
    
    const sanitizedProduct = {
      id: randomUUID(),
      title: productData.title.trim(),
      description: productData.description?.trim() || '',
      price: productData.price,
      count: productData.count !== undefined ? productData.count : 0
    };

    const transactItems = getCreateProductTransactionItems(sanitizedProduct)
    await createItemInDBWithTransaction(transactItems);

    return sanitizedProduct;
  } catch (error) {
    logEvent(`Error processing record: ${error}`);
    throw new Error('Failed to create product with stock');
  }
}

export const lambdaHandler = handler;
