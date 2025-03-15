import { SQSEvent, SQSRecord, SQSBatchResponse } from 'aws-lambda';

import { logEvent } from '../src/common/utils';
import { createItemInDBWithTransaction } from '../src/common/clients/DBClient';
import { getCreateProductTransactionItems } from '../src/common/clients/helpers';
import { runValidationForProduct } from '../src/common/validators';
import { sendSNSNotification } from '../src/common/clients/SNSClient';
import { handler } from '../src/handlers/catalogBatchProcess';

jest.mock('../src/common/utils');
jest.mock('../src/common/clients/DBClient');
jest.mock('../src/common/clients/helpers');
jest.mock('../src/common/validators');
jest.mock('../src/common/clients/SNSClient');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid'),
}));

describe('catalogBatchProcess handler', () => {
  const recordBody1 = {
    title: 'Product 1',
    description: 'Product 1 desc',
    price: 100,
    count: 10,
  };

  const recordBody2 = {
    title: 'Product 2',
    description: 'Product 2 desc',
    price: 200,
  };

  const validRecord1: SQSRecord = {
    body: JSON.stringify(recordBody1),
    messageId: 'msg-1',
  } as unknown as SQSRecord;

  const validRecord2: SQSRecord = {
    body: JSON.stringify(recordBody2),
    messageId: 'msg-2',
  } as unknown as SQSRecord;

  const invalidRecord: SQSRecord = {
    body: 'Invalid JSON',
    messageId: 'msg-3',
  } as unknown as SQSRecord;

  const sqsEvent: SQSEvent = {
    Records: [validRecord1, validRecord2, invalidRecord],
  };

  beforeEach(() => {
    (runValidationForProduct as jest.Mock).mockImplementation((product) => {
      if (!product.title) throw new Error('Validation failed');
    });

    (getCreateProductTransactionItems as jest.Mock).mockReturnValue([{ key: 'transaction-item' }]);

    (createItemInDBWithTransaction as jest.Mock).mockResolvedValue(null); // Mock successful DB transaction

    (sendSNSNotification as jest.Mock).mockResolvedValue(null); // Mock SNS notification
  });

  it('should process all valid records', async () => {
    const response: SQSBatchResponse = await handler(sqsEvent);

    // Validate database transactions and SNS notification calls
    expect(createItemInDBWithTransaction).toHaveBeenCalledTimes(2);
    expect(createItemInDBWithTransaction).toHaveBeenCalledWith(
      [{ key: 'transaction-item' }]
    );

    expect(sendSNSNotification).toHaveBeenCalledWith([
      {
        id: 'test-uuid',
        title: recordBody1.title,
        description: recordBody1.description,
        price: recordBody1.price,
        count: recordBody1.count,
      },
      {
        id: 'test-uuid',
        title: recordBody2.title,
        description: recordBody2.description,
        price: recordBody2.price,
        count: 0,
      },
    ]);
  });

  it('should handle validation errors and fail the record', async () => {
    const response: SQSBatchResponse = await handler({ Records: [invalidRecord] });

    // Validate batch failure response for the record
    expect(response).toEqual({
      batchItemFailures: [{ itemIdentifier: invalidRecord.messageId }],
    });

    // SNS notification should not be sent since no records were successfully processed
    expect(sendSNSNotification).not.toHaveBeenCalled();

    expect(createItemInDBWithTransaction).not.toHaveBeenCalled(); // No DB transactions attempted
  });

  it('should handle errors from database transaction gracefully', async () => {
    (createItemInDBWithTransaction as jest.Mock).mockRejectedValue(new Error('DB error'));

    const response: SQSBatchResponse = await handler({ Records: [validRecord1] });

    // Validate batch failure response for the record
    expect(response).toEqual({ 
      batchItemFailures: [{ itemIdentifier: 'msg-1' }]
    });

    expect(sendSNSNotification).not.toHaveBeenCalled(); // SNS notification not sent

    // Validate error logging
    expect(logEvent).toHaveBeenCalledWith(expect.stringContaining('Error processing record:'));
  });
});