// Personal best, career points, and progress reset.
import { supabase, friendlyError } from '../../shared/supabase.js';

const $ = (id) => document.getElementById(id);

export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('game_profiles')
    .select('high_score,total_points')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  $('highScoreValue').textContent = (Number(data.high_score) || 0).toLocaleString();
  $('totalPointsValue').textContent = (Number(data.total_points) || 0).toLocaleString();
}

export function subscribeToProfile(userId, onChange) {
  return supabase
    .channel(`profile-${userId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'game_profiles', filter: `user_id=eq.${userId}`
    }, onChange)
    .subscribe();
}

export async function resetProgress(userId) {
  const { error } = await supabase
    .from('game_profiles')
    .update({ high_score: 0, total_points: 0, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw new Error(friendlyError(error));
}
