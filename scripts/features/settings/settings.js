// Settings actions: reset progress and request secure account deletion.
import { supabase } from '../../shared/supabase.js';
import { resetProgress } from '../profile/profile.js';

const $ = (id) => document.getElementById(id);

export function bindSettings(getUser) {
  $('resetButton').addEventListener('click', async () => {
    const user = getUser();
    if (!user || !confirm('Reset your high score and career points to zero?')) return;
    $('settingsMessage').textContent = '';
    $('resetButton').disabled = true;
    try {
      await resetProgress(user.id);
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
