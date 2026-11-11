// Settings actions: reset progress and request secure account deletion.
import { supabase } from '../../shared/supabase.js';
import { resetProgress, savePlayerName } from '../profile/profile.js';

const $ = (id) => document.getElementById(id);

export function bindSettings(getUser) {
  $('playerNameForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!getUser()) return;
    const name = $('playerNameInput').value.trim();
    if (name.length < 2 || name.length > 20) {
      $('playerNameMessage').textContent = 'Choose a name between 2 and 20 characters.';
      $('playerNameMessage').className = 'settings-feedback error';
      return;
    }

    $('savePlayerNameButton').disabled = true;
    $('playerNameMessage').textContent = '';
    try {
      await savePlayerName(name);
      $('playerNameInput').value = name;
      $('playerNameMessage').textContent = 'In-game name saved.';
      $('playerNameMessage').className = 'settings-feedback success';
    } catch (error) {
      $('playerNameMessage').textContent = error.message || 'Could not save your in-game name.';
      $('playerNameMessage').className = 'settings-feedback error';
    } finally {
      $('savePlayerNameButton').disabled = false;
    }
  });

  $('resetButton').addEventListener('click', async () => {
    const user = getUser();
    if (!user || !confirm('Reset your high score and career points to zero?')) return;
    $('settingsMessage').textContent = '';
    $('resetButton').disabled = true;
    try {
      await resetProgress();
      $('settingsMessage').textContent = 'Your progress has been reset.';
    } catch (error) {
      $('settingsMessage').textContent = error.message;
    } finally {
      $('resetButton').disabled = false;
    }
  });

  $('deleteAccountButton').addEventListener('click', async () => {
    if (!getUser() || !confirm('Permanently delete your Rene Game account and all saved stats? This cannot be undone.')) return;
    $('settingsMessage').textContent = '';
    $('deleteAccountButton').disabled = true;
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await supabase.auth.signOut();
    } catch (error) {
      $('settingsMessage').textContent = error.message || 'Account deletion failed.';
    } finally {
      $('deleteAccountButton').disabled = false;
    }
  });
}
