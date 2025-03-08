export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // Allows requests from any origin
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,GET"
}

export const baseHeaders = {
  'Content-Type': 'application/json',
  ...corsHeaders
};

export const IMPORT_BUCKET_NAME = process.env.IMPORT_BUCKET_NAME || '';
export const IMPORT_BUCKET_PREFIX = process.env.IMPORT_BUCKET_PREFIX || '';
