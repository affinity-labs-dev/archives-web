import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Web-compatible storage wrapper for Supabase
class SupabaseWebStorage {
  private static isClient = typeof window !== 'undefined';
  
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web' && !SupabaseWebStorage.isClient) {
      return null; // Return null during SSR
    }
    
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`Supabase storage getItem error for key ${key}:`, error);
      return null;
    }
  }
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web' && !SupabaseWebStorage.isClient) {
      return; // Skip during SSR
    }
    
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Supabase storage setItem error for key ${key}:`, error);
    }
  }
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web' && !SupabaseWebStorage.isClient) {
      return; // Skip during SSR
    }
    
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`Supabase storage removeItem error for key ${key}:`, error);
    }
  }
}

// Create web-compatible storage instance
const webCompatibleStorage = new SupabaseWebStorage();

// Create Supabase client with web-compatible configuration
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: webCompatibleStorage as any, // Type assertion needed for compatibility
    autoRefreshToken: Platform.OS !== 'web',
    persistSession: Platform.OS !== 'web',
    detectSessionInUrl: false,
  },
});

