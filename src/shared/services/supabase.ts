import { createClient } from '@supabase/supabase-js'
import type { Database } from '@everylanguage/shared-types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper function to check if client is properly initialized
export const isSupabaseConnected = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    
    // If there's no error, connection is working
    return !error;
  } catch (err) {
    console.error('Supabase connection check failed:', err);
    return false;
  }
};

// Log successful initialization
console.log('Supabase client initialized successfully'); 