// Database client for Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
export class DatabaseClient {
  supabase;
  constructor(){
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  async getEmailAccount(accountId) {
    const { data, error } = await this.supabase.from('email_accounts').select('*').eq('id', accountId).single();
    if (error) {
      console.error('Failed to get email account:', error);
      return null;
    }
    return data;
  }
}
