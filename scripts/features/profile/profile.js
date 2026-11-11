// Personal best, career points, and progress reset.
import { supabase, friendlyError } from '../../shared/supabase.js';

const $ = (id) => document.getElementById(id);

export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('game_profiles')
    .select('display_name,high_score,total_points')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  $('highScoreValue').textContent = (Number(data.high_score) || 0).toLocaleString();
  $('totalPointsValue').textContent = (Number(data.total_points) || 0).toLocaleString();
  if (document.activeElement !== $('playerNameInput')) {
    $('playerNameInput').value = data.display_name || '';
  }
}

export function subscribeToProfile(userId, onChange) {
  return supabase
    .channel(`profile-${userId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'game_profiles', filter: `user_id=eq.${userId}`
    }, onChange)
    .subscribe();
}

export async function resetProgress() {
  const { error } = await supabase.rpc('reset_game_progress');
  if (error) throw new Error(friendlyError(error));
}

export async function savePlayerName(name) {
  const { error } = await supabase.rpc('set_player_name', { new_name: name });
  if (error) throw new Error(friendlyError(error));
}
