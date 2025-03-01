import { ValidationError } from './utils';

import { TCreateProductPayload } from './types';

export const validateProduct = (product: TCreateProductPayload): void => {
  // Required fields check
  const requiredFields: (keyof TCreateProductPayload)[] = ['title', 'description', 'price'];
  const missingFields = requiredFields.filter(field => !product[field]);
  
  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }

  if (typeof product.title !== 'string' || product.title.trim().length === 0) {
    throw new ValidationError('Title must be a non-empty string');
  }

  if (product.description !== undefined && typeof product.description !== 'string') {
    throw new ValidationError('Description must be a string');
  }

  if (typeof product.price !== 'number' || product.price < 0) {
    throw new ValidationError('Price must be a non-negative number');
  }

  // Optional field validations
  if (product.count !== undefined && 
      (typeof product.count !== 'number' || 
       product.count < 0 || 
       !Number.isInteger(product.count))) {
    throw new ValidationError('Count must be a non-negative integer');
  }
};
