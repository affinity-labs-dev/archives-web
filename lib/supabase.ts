import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test function to verify Supabase connection and database table
export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('📍 URL:', supabaseUrl);
    console.log('🔑 Key starts with:', supabaseAnonKey.substring(0, 20) + '...');
    
    // Test 1: Basic connection health check
    const { data, error } = await supabase
      .from('_realtime')
      .select('*')
      .limit(1);
    
    if (error) {
      // These error codes mean connection is working but table doesn't exist (normal for new projects)
      if (error.code === '42P01' || error.code === 'PGRST205') {
        console.log('✅ Supabase connection successful!');
      } else {
        console.error('❌ Supabase connection failed:', error);
        return false;
      }
    } else {
      console.log('✅ Supabase connection successful!');
    }
    
    // Test 2: Check if user_progress table exists and is accessible
    console.log('🔍 Testing user_progress table...');
    const { data: tableData, error: tableError } = await supabase
      .from('user_progress')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ user_progress table test failed:', tableError);
      return false;
    } else {
      console.log('✅ user_progress table is accessible!');
      console.log('📊 Table data:', tableData?.length || 0, 'records found');
    }
    
    console.log('🎯 All tests passed! Database is ready for use.');
    return true;
  } catch (error) {
    console.error('❌ Supabase test error:', error);
    return false;
  }
};