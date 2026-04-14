// src/services/users-client.js
import { supabase } from '../config/supabase';

export async function updateOwnProfile({ username, firstName, lastName, email }) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw 'Niste prijavljeni.';

  // Check username uniqueness if changing it
  if (username !== undefined) {
    const { data: existing } = await supabase
      .from('Users')
      .select('id, deleted_at')
      .ilike('username', username)
      .neq('id', user.id)
      .maybeSingle();

    if (existing) {
      const message = existing.deleted_at
        ? `Uporabniško ime "${username}" pripada izbrisanemu uporabniku in ga ni mogoče ponovno uporabiti.`
        : `Uporabniško ime "${username}" je že zasedeno.`;
      throw message;
    }
  }

  // Check email uniqueness if changing it
  if (email !== undefined && email !== user.email) {
    const { data: existingEmail } = await supabase
      .from('Users')
      .select('id, deleted_at')
      .eq('email', email)
      .neq('id', user.id)
      .maybeSingle();

    if (existingEmail) {
      const message = existingEmail.deleted_at
        ? `E-poštni naslov "${email}" pripada izbrisanemu uporabniku in ga ni mogoče ponovno uporabiti.`
        : `E-poštni naslov "${email}" je že zaseden.`;
      throw message;
    }
  }

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