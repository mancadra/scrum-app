import { supabase } from "../config/supabase";

export async function signIn(username, password) {
    const { data: userData, error: userError } = await supabase
      .from('Users')
      .select('email')
      .eq('username', username)
      .single()

    if (userError || !userData) throw new Error('Invalid username or password.')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    })

    if (error) throw new Error('Invalid username or password.')

    await updateLastLogin(data.user.id)

    return data.user
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
}

export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: profile } = await supabase
      .from('Users')
      .select('*, UserRoles(FK_roleId, Roles(name))')
      .eq('id', user.id)
      .single()

    return { ...user, profile }
}

// TODO popravi da se shrani "preprejšnja prijava", če se zdaj prijavimo da se pokaže last logged in npr. prejšnji teden
export async function updateLastLogin(userId) {
    const { error } = await supabase
      .from('Users')
      .update({ lastLogin: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw new Error(error.message)
}

export async function changePassword(oldPassword, newPassword) {
    validatePassword(newPassword)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    })

    if (signInError) throw new Error('Old password is incorrect.')

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
}

export function validatePassword(password) {
    if (password.length < 12) throw new Error('Password must be at least 12 characters.')
    if (password.length > 128) throw new Error('Password must not exceed 128 characters.')
    if (/  /.test(password)) throw new Error('Password must not contain consecutive spaces.')
  }