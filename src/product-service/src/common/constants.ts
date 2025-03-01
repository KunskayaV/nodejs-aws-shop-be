export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // Allows requests from any origin
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,GET"
}

export const baseHeaders = {
  'Content-Type': 'application/json',
  ...corsHeaders
};

export const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME || '';
export const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME || '';