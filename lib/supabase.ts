import { createClient } from '@supabase/supabase-js'

//const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
//const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseUrl = 'https://rhdepoxamlohzlnhociz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZGVwb3hhbWxvaHpsbmhvY2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjcwMTEsImV4cCI6MjA5MTA0MzAxMX0.9IeRMF8UgKIhJH8fMbHcOrZtlwZXa7o8Ru2YAi_cPX8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)