import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  paginateScan,
  PutCommand,
  PutCommandInput,
  ScanCommandInput,
  TransactWriteCommand,
  TransactWriteCommandInput
} from "@aws-sdk/lib-dynamodb";
import { logEvent } from "../utils";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const getItemFromDB = async (params: GetCommandInput) => {
  logEvent(`getItemFromDB params: ${JSON.stringify(params)}`, 'DBClient');

  const getCommand = new GetCommand(params);

  const response = await docClient.send(getCommand);

  return response.Item;
}

export const getItemsFromDB = async <T,>(params: ScanCommandInput) => {
  logEvent(`getItemsFromDB params: ${JSON.stringify(params)}`, 'DBClient');

  const paginatedScan = paginateScan(
    { client: docClient },
    params
  );
    
  const resultItems: T[] = [];
  for await (const page of paginatedScan) {
    const items = (page.Items ||[]) as T[];

    resultItems.push(...items);
  }

  return resultItems;
}

export const createItemInDB = async <T>(params: PutCommandInput) => {
  logEvent(`createItemInDB params: ${JSON.stringify(params)}`, 'DBClient');

  const putCommand = new PutCommand(params);

  const response = await docClient.send(putCommand);

  return response;
}

export const createItemInDBWithTransaction = async <T>(transactItems: TransactWriteCommandInput) => {
  logEvent(`createItemInDBWithTransaction transactItems: ${JSON.stringify(transactItems)}`, 'DBClient');

  // Execute the transaction
  await docClient.send(new TransactWriteCommand(transactItems));
}