import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://wzgqlkfisrhgekshysks.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_ejvCUEWR2mPsnOPtlQruBg_sdg7TnvV';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);