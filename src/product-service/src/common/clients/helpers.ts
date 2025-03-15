import { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { PRODUCT_TABLE_NAME, STOCK_TABLE_NAME } from "../constants";
import { TCreateProductPayload } from "../types";

export const getCreateProductTransactionItems = (product: TCreateProductPayload & { id: string }) => {
  // Create TransactWrite operation
  const transactItems: TransactWriteCommandInput = {
    TransactItems: [
      {
        Put: {
          TableName: PRODUCT_TABLE_NAME,
          Item: product,
          // Ensure the item doesn't already exist
          ConditionExpression: 'attribute_not_exists(id)'
        }
      }
    ]
  };

  if (product.count) {
    transactItems.TransactItems?.push({
      Put: {
        TableName: STOCK_TABLE_NAME,
        Item: {
          product_id: product.id,
          count: product.count
        },
        // Ensure the item doesn't already exist
        ConditionExpression: 'attribute_not_exists(product_id)'
      }
    });
  }
  return transactItems;
}