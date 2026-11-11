// Email/password sign-up, login, logout, and session observation.
import { supabase, isSupabaseConfigured, friendlyError } from '../../shared/supabase.js';

let mode = 'login';
const $ = (id) => document.getElementById(id);

function setMode(nextMode) {
  mode = nextMode;
  $('loginTab').classList.toggle('active', mode === 'login');
  $('signupTab').classList.toggle('active', mode === 'signup');
  $('authSubmit').textContent = mode === 'login' ? 'Log in' : 'Create account';
  $('passwordInput').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  $('authError').textContent = '';
}

export function bindAuthForm() {
  $('loginTab').addEventListener('click', () => setMode('login'));
  $('signupTab').addEventListener('click', () => setMode('signup'));
  $('authForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      $('authError').textContent = 'Add your Supabase project URL and publishable key in scripts/shared/supabase.js.';
      return;
    }

    $('authSubmit').disabled = true;
    $('authError').textContent = '';
    const email = $('emailInput').value.trim();
    const password = $('passwordInput').value;
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) $('authError').textContent = 'Check your email to confirm your account, then log in.';
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      $('authError').textContent = friendlyError(error);
    } finally {
      $('authSubmit').disabled = false;
    }
  });
}

export function signOut() {
  return supabase?.auth.signOut();
}

export function watchAuth(onSession) {
  if (!supabase) return null;
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    // Defer database work until Supabase has released its internal auth lock.
    queueMicrotask(() => onSession(session));
  });
  supabase.auth.getSession().then(({ data }) => onSession(data.session));
  return subscription;
}
