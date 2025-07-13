import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.',
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic session refresh
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session from URL hash
    detectSessionInUrl: true,
  },
});

// Export client for use in other modules
export default supabase;

// Helper function to check if client is properly initialized
export const isSupabaseConnected = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('_supabase_health_check').select('*').limit(1);
    
    // If there's no error or if the error is about the table not existing, 
    // it means the connection is working
    return !error || error.message.includes('relation "_supabase_health_check" does not exist');
  } catch (err) {
    console.error('Supabase connection check failed:', err);
    return false;
  }
};

// Log successful initialization
console.log('Supabase client initialized successfully'); 