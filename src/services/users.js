import { createClient } from '@supabase/supabase-js'
import { validatePassword } from './auth.js'

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

  if (error || !data) throw new Error(`Role "${roleName}" not found.`)
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
    throw new Error('Access denied. This is an admin-only action.')
  }

  // 2. Validate required fields
  if (!username || !password || !email || !firstName || !lastName || !role) {
    throw new Error('All fields are required, fill out missing data.')
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
    throw new Error(`Username "${username}" is already taken.`)
  }

  // 6. Create the auth user (Supabase handles password hashing automatically)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) throw new Error(`Failed to create auth user: ${authError.message}`)

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
    throw new Error(`Failed to create user profile: ${insertError.message}`)
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
    throw new Error(`Failed to assign role: ${roleError.message}`)
  }

  return { ...newUser, role }
}