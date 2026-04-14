// src/services/users-client.js
import { supabase } from '../config/supabase';

export async function updateOwnProfile({ username, firstName, lastName, email }) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw 'Niste prijavljeni.';

  // Pripravi posodobitev
  const profileUpdate = {};
  if (username !== undefined) profileUpdate.username = username;
  if (firstName !== undefined) profileUpdate.name = firstName;
  if (lastName !== undefined) profileUpdate.surname = lastName;
  if (email !== undefined) profileUpdate.email = email;

  // Uporabi navaden 'supabase' klient (ne admin!)
  const { error } = await supabase
    .from('Users')
    .update(profileUpdate)
    .eq('id', user.id);

  if (error) throw error.message;

  // Če se spreminja email, posodobi še Auth
  if (email !== undefined && email !== user.email) {
    const { error: authUpdateError } = await supabase.auth.updateUser({ email });
    if (authUpdateError) throw authUpdateError.message;
  }
}