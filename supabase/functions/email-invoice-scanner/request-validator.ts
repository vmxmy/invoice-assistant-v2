// Request validation and authentication
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { ErrorCode, ApiError } from './error-handler.ts';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export async function validateRequest(req) {
  // Extract token from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError('Missing or invalid authorization header', ErrorCode.AUTHENTICATION_ERROR, 401);
  }
  const token = authHeader.substring(7);
  // Verify token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new ApiError('Invalid authentication token', ErrorCode.AUTHENTICATION_ERROR, 401);
  }
  return token;
}
