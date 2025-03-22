export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // Allows requests from any origin
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,GET"
};

export const USER_NAME = process.env.USER_NAME || '';
export const USER_PASSWORD = process.env.USER_PASSWORD || '';