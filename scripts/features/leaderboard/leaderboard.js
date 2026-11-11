// Top ten public player scores and live leaderboard refresh.
import { supabase, friendlyError } from '../../shared/supabase.js';

const $ = (id) => document.getElementById(id);

export async function loadLeaderboard() {
  const { data, error } = await supabase
    .from('game_profiles')
    .select('display_name,high_score')
    .order('high_score', { ascending: false })
    .limit(10);
  if (error) throw error;

  const rows = $('leaderboardRows');
  rows.replaceChildren();
  if (!data.length) {
    rows.innerHTML = '<tr><td colspan="3" class="empty">No scores yet. Be the first to play!</td></tr>';
    return;
  }
  data.forEach((player, index) => {
    const row = document.createElement('tr');
    const rank = document.createElement('td');
    rank.className = 'rank';
    rank.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('td');
    name.textContent = player.display_name || 'Player';
    const score = document.createElement('td');
    score.textContent = (Number(player.high_score) || 0).toLocaleString();
    row.append(rank, name, score);
    rows.append(row);
  });
  $('leaderboardError').textContent = '';
}

export function subscribeToLeaderboard(onChange) {
  return supabase
    .channel('global-game-leaderboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_profiles' }, onChange)
    .subscribe();
}

export function showLeaderboardError(error) {
  $('leaderboardRows').innerHTML = '<tr><td colspan="3" class="empty">Leaderboard could not load.</td></tr>';
  $('leaderboardError').textContent = friendlyError(error);
}
