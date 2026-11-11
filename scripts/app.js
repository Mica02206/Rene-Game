// Application entry point: connects UI features and manages the signed-in session.
import { supabase } from './shared/supabase.js';
import { bindAuthForm, signOut, watchAuth } from './features/auth/auth.js';
import { loadProfile, subscribeToProfile } from './features/profile/profile.js';
import { loadLeaderboard, showLeaderboardError, subscribeToLeaderboard } from './features/leaderboard/leaderboard.js';
import { initGame } from './features/game/game.js';
import { recordRun } from './features/scores/scores.js';
import { bindSettings } from './features/settings/settings.js';

const $ = (id) => document.getElementById(id);
const authScreen = $('authScreen');
const app = $('app');
let currentUser = null;
let profileChannel = null;
let leaderboardChannel = null;

function showView(viewId) {
  ['homeView', 'leaderboardView', 'settingsView'].forEach((id) => {
    $(id).classList.toggle('hidden', id !== viewId);
  });
}

async function refreshProfile() {
  if (!currentUser) return;
  try {
    await loadProfile(currentUser.id);
    $('settingsMessage').textContent = '';
  } catch (error) {
    $('settingsMessage').textContent = error.message || 'Could not load your profile.';
  }
}

async function refreshLeaderboard() {
  try {
    await loadLeaderboard();
  } catch (error) {
    showLeaderboardError(error);
  }
}

async function clearUserSession() {
  currentUser = null;
  if (supabase && profileChannel) await supabase.removeChannel(profileChannel);
  if (supabase && leaderboardChannel) await supabase.removeChannel(leaderboardChannel);
  profileChannel = null;
  leaderboardChannel = null;
  app.classList.add('hidden');
  $('gameScreen').classList.add('hidden');
  authScreen.classList.remove('hidden');
}

async function activateSession(session) {
  const user = session?.user || null;
  if (!user) {
    if (currentUser) await clearUserSession();
    return;
  }
  if (currentUser?.id === user.id) return;
  if (profileChannel && supabase) await supabase.removeChannel(profileChannel);
  if (leaderboardChannel && supabase) await supabase.removeChannel(leaderboardChannel);
  currentUser = user;
  authScreen.classList.add('hidden');
  app.classList.remove('hidden');
  $('gameScreen').classList.add('hidden');
  $('userEmail').textContent = user.email || '';
  $('settingsMessage').textContent = '';
  showView('homeView');

  await Promise.all([refreshProfile(), refreshLeaderboard()]);
  profileChannel = subscribeToProfile(user.id, refreshProfile);
  leaderboardChannel = subscribeToLeaderboard(refreshLeaderboard);
}

bindAuthForm();
bindSettings(() => currentUser);
initGame({
  onSaveRun: async (score) => {
    try {
      await recordRun(score);
      $('saveStatus').textContent = 'Score saved to your profile.';
      await refreshProfile();
    } catch (error) {
      $('saveStatus').textContent = `Could not save score: ${error.message || 'Please try again.'}`;
    }
  }
});

$('signOutButton').addEventListener('click', async () => {
  try {
    await signOut();
  } catch (error) {
    $('settingsMessage').textContent = error.message || 'Could not log out.';
  }
});
$('leaderboardButton').addEventListener('click', () => {
  showView('leaderboardView');
  refreshLeaderboard();
});
$('settingsButton').addEventListener('click', () => showView('settingsView'));
document.querySelectorAll('.backHome').forEach((button) => {
  button.addEventListener('click', () => showView('homeView'));
});

if (supabase) {
  watchAuth(activateSession);
} else {
  authScreen.classList.remove('hidden');
}
