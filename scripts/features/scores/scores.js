// Score persistence. The SQL RPC updates best score and career points atomically.
import { supabase } from '../../shared/supabase.js';

export async function recordRun(score) {
  const { error } = await supabase.rpc('record_game_run', { run_score: score });
  if (error) throw error;
}
