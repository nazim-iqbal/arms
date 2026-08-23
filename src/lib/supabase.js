import { createClient } from '@supabase/supabase-js';

// TODO: Replace with actual Supabase URL and Anon Key from the dashboard
const supabaseUrl = 'https://dkbdlmvbpuozesrwpicf.supabase.co';
const supabaseAnonKey = 'sb_publishable_8T0M9vQ9KYRH_scIPnA_Sg_ZLuhCu3O';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
