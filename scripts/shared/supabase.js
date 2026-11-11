// Shared Supabase client and error-message helper.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Paste the values from Supabase Dashboard → Project Settings → API.
export const SUPABASE_URL = 'https://xcchdliwxbjxzgdqowgz.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Ykrqq-y5EmXvzIuHTFXomQ_fogfpMn4';
export const isSupabaseConfigured =
  !SUPABASE_URL.includes('YOUR_') && !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

export function friendlyError(error) {
  const message = error?.message || 'Something went wrong. Please try again.';
  if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
  if (/user already registered/i.test(message)) return 'That email already has an account. Try logging in.';
  if (/row-level security|permission denied/i.test(message)) {
    return 'Supabase denied this database operation. Run supabase/database/fix-settings.sql in the SQL Editor, then retry.';
  }
  if (/reset_game_progress|set_player_name/i.test(message) && /function|schema cache|not found/i.test(message)) {
    return 'The settings functions are not installed yet. Run supabase/database/fix-settings.sql in the SQL Editor.';
  }
  return message;
}
