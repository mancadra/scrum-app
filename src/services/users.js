import { createClient } from '@supabase/supabase-js'
import { validatePassword } from './auth.js'
import { supabase } from '../config/supabase.js'

// Service role client — NEVER expose this on the frontend
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Helper: get a role ID by name (e.g. 'Admin' or 'User') ──────────────────

async function getRoleId(roleName) {
  const { data, error } = await supabaseAdmin
    .from('Roles')
    .select('id')
    .eq('name', roleName)
    .single()

  if (error || !data) throw new Error(`Vloga "${roleName}" ni bila najdena.`)
  return data.id
}

// ─── Helper: check if a user has a specific role ──────────────────────────────

export async function userHasRole(userId, roleName) {
  const roleId = await getRoleId(roleName)

  const { data, error } = await supabaseAdmin
    .from('UserRoles')
    .select('FK_roleId')
    .eq('FK_userId', userId)
    .eq('FK_roleId', roleId)
    .single()

  if (error || !data) return false
  return true
}

// ─── Helper: check if the requesting user is an admin ────────────────────────

export async function isAdmin(requestingUserId) {
  return await userHasRole(requestingUserId, 'Admin')
}

// ─── Create a new user (admin only) ──────────────────────────────────────────

export async function createUser(requestingUserId, { username, password, email, firstName, lastName, role }) {

  // 1. Verify the requesting user is an admin
  if (!(await isAdmin(requestingUserId))) {
    throw new Error('Dostop zavrnjen. To dejanje je dovoljeno samo administratorjem.')
  }

  // 2. Validate required fields
  if (!username || !password || !email || !firstName || !lastName || !role) {
    throw new Error('Vsa polja so obvezna, izpolnite manjkajoče podatke.')
  }

  // 3. Validate password against rules + common password list
  validatePassword(password)

  // 4. Resolve the role ID (also validates that the role actually exists in the Roles table)
  const roleId = await getRoleId(role)

  // 5. Check for duplicate username
  const { data: existingUser } = await supabaseAdmin
    .from('Users')
    .select('id')
    .ilike('username', username)
    .single()

  if (existingUser) {
    throw new Error(`Uporabniško ime "${username}" je že zasedeno.`)
  }

  // 6. Create the auth user (Supabase handles password hashing automatically)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) throw new Error(`Napaka pri ustvarjanju uporabnika: ${authError.message}`)

  // 7. Insert into public Users table
  const { data: newUser, error: insertError } = await supabaseAdmin
    .from('Users')
    .insert({
      id: authData.user.id,
      username,
      email,
      name: firstName,
      surname: lastName,
    })
    .select()
    .single()

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    throw new Error(`Napaka pri ustvarjanju profila: ${insertError.message}`)
  }

  // 8. Assign the role in UserRoles
  const { error: roleError } = await supabaseAdmin
    .from('UserRoles')
    .insert({
      FK_userId: newUser.id,
      FK_roleId: roleId,
    })

  if (roleError) {
    // Roll back both the auth user and the profile row
    await supabaseAdmin.from('Users').delete().eq('id', newUser.id)
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    throw new Error(`Napaka pri dodeljevanju vloge: ${roleError.message}`)
  }

  return { ...newUser, role }
}

// ─── Update own profile (any logged-in user) ─────────────────────────────────

export async function updateOwnProfile({ username, firstName, lastName, email }) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Niste prijavljeni.')

  // Check username uniqueness if changing
  if (username !== undefined) {
    const { data: existing } = await supabase
      .from('Users')
      .select('id')
      .ilike('username', username)
      .neq('id', user.id)
      .maybeSingle()

    if (existing) throw new Error(`Uporabniško ime "${username}" je že zasedeno.`)
  }

  // Update public Users table
  const profileUpdate = {}
  if (username !== undefined)   profileUpdate.username = username
  if (firstName !== undefined)  profileUpdate.name     = firstName
  if (lastName !== undefined)   profileUpdate.surname  = lastName
  if (email !== undefined)      profileUpdate.email    = email

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase
      .from('Users')
      .update(profileUpdate)
      .eq('id', user.id)

    if (error) throw new Error(error.message)
  }

  // Sync email change into auth.users
  if (email !== undefined) {
    const { error: authUpdateError } = await supabase.auth.updateUser({ email })
    if (authUpdateError) throw new Error(authUpdateError.message)
  }
}