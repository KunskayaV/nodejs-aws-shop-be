const path = require('path');
const { readFileSync } = require('node:fs');
const { DescribeTableCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { BatchWriteCommand, DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const { log, chunkArray } = require('./utils');

const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME || '';
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME || '';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function getTableWriteCapacity(params) {
  const command = new DescribeTableCommand(params);
  const tableLimits = await client.send(command);

  return tableLimits.Table.ProvisionedThroughput.WriteCapacityUnits;
}


async function addItemsIntoTable(data, tableName, tableWriteCapacity) {
  log(`Adding items into ${tableName} from local JSON file.`);
  const itemChunks = chunkArray(data, tableWriteCapacity);
  for (const chunk of itemChunks) {
    const putRequests = chunk.map((item) => ({
      PutRequest: {
        Item: item,
      },
    }));

    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: putRequests,
      },
    });
    

    await docClient.send(command);
  }
  log(`${data.length} items have been added`);
}

const main = async () => {
  try {
    const productParams = {
      TableName: PRODUCT_TABLE_NAME,
    };
  
    const stockParams = {
      TableName: STOCK_TABLE_NAME,
    };

    const productTableWriteCapacity = await getTableWriteCapacity(productParams);
    const stockTableWriteCapacity = await getTableWriteCapacity(stockParams);

    const productsFile = readFileSync(path.join(__dirname, 'products.json'));
    const products = JSON.parse(productsFile.toString());
    await addItemsIntoTable(products, PRODUCT_TABLE_NAME, productTableWriteCapacity);
  
    const stockFile = readFileSync(path.join(__dirname, 'stock.json'));
    const productsStockInfo = JSON.parse(stockFile.toString());
    await addItemsIntoTable(productsStockInfo, STOCK_TABLE_NAME, stockTableWriteCapacity);
  } catch (error) {
    if (error['$metadata']?.httpStatusCode === 400) {
      log(`Error: ${error.message}.\nCheck if the tables you want to work with exist`);
    } else {
      log('Error:', error.message);
    }
  }
};


// Call a function if this file was run directly. This allows the file
// to be runnable without running on import.
if (process.argv[1] === __filename) {
  main();
}
