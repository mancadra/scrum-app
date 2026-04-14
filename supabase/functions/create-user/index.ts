import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOP_100_PASSWORDS = new Set([
  "password1234", "123456789012", "qwertyuiop12", "iloveyou1234",
  "monkey123456", "dragon123456", "master123456", "letmein12345",
  "sunshine1234", "princess1234", "football1234", "superman1234",
  "batman123456", "trustno11234", "shadow123456", "michael12345",
  "jessica12345", "qwerty123456", "welcome12345", "admin1234567",
  "login1234567", "access123456", "freedom12345", "starwars1234",
  "minecraft123", "matrix123456", "hunter123456", "passw0rd1234",
  "password12345", "iloveyou12345", "letmein123456", "monkey1234567",
  "dragon1234567", "master1234567", "sunshine12345", "princess12345",
  "football12345", "superman12345", "mustang12345", "starwars12345",
  "freedom12345", "minecraft1234", "welcome12345", "computer12345",
  "michelle12345", "jennifer12345", "passw0rd12345", "trustno112345",
  "shadow123456", "michael123456", "jessica123456", "qwerty1234567",
  "admin12345678", "password123456", "iloveyou123456", "letmein1234567",
  "monkey12345678", "dragon12345678", "master12345678", "sunshine123456",
  "princess123456", "football123456", "superman123456", "batman12345678",
  "trustno1123456", "shadow1234567", "michael1234567", "jessica1234567",
  "qwerty12345678", "welcome123456", "admin123456789", "login123456789",
  "access1234567", "freedom123456",
])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function validatePassword(password: string) {
  if (password.length < 12) throw new Error('Password must be at least 12 characters.')
  if (password.length > 128) throw new Error('Password must not exceed 128 characters.')
  if (/  /.test(password)) throw new Error('Password must not contain consecutive spaces.')
  if (TOP_100_PASSWORDS.has(password.toLowerCase())) throw new Error('Password is too common.')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Verify the requesting user via their JWT using a user-scoped client
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser()

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  // Check if requesting user is an admin
  const { data: roleData } = await supabaseAdmin
    .from('UserRoles')
    .select('Roles(name)')
    .eq('FK_userId', user.id)

  const isAdmin = roleData?.some((r: any) => r.Roles?.name === 'Admin')
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Access denied. This is an admin-only action.' }),
      { status: 403, headers: corsHeaders }
    )
  }

  const { username, password, email, firstName, lastName, role } = await req.json()

  if (!username || !password || !email || !firstName || !lastName || !role) {
    return new Response(
      JSON.stringify({ error: 'All fields are required, fill out missing data.' }),
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    validatePassword(password)
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders })
  }

  // Resolve role ID
  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from('Roles')
    .select('id')
    .eq('name', role)
    .single()

  if (roleError || !roleRow) {
    return new Response(JSON.stringify({ error: `Role "${role}" not found.` }), { status: 400, headers: corsHeaders })
  }

  // Check for duplicate username
  const { data: existingUser } = await supabaseAdmin
    .from('Users')
    .select('id, deleted_at')
    .eq('username', username)
    .maybeSingle()

  if (existingUser) {
    const message = existingUser.deleted_at
      ? `Uporabniško ime "${username}" pripada izbrisanemu uporabniku in ga ni mogoče ponovno uporabiti.`
      : `Uporabniško ime "${username}" je že zasedeno.`
    return new Response(
      JSON.stringify({ error: message }),
      { status: 409, headers: corsHeaders }
    )
  }

  // Check for duplicate email
  const { data: existingEmail } = await supabaseAdmin
    .from('Users')
    .select('id, deleted_at')
    .eq('email', email)
    .maybeSingle()

  if (existingEmail) {
    const message = existingEmail.deleted_at
      ? `E-poštni naslov "${email}" pripada izbrisanemu uporabniku in ga ni mogoče ponovno uporabiti.`
      : `E-poštni naslov "${email}" je že zaseden.`
    return new Response(
      JSON.stringify({ error: message }),
      { status: 409, headers: corsHeaders }
    )
  }

  // Create the auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: corsHeaders })
  }

  // Insert into Users table
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
    return new Response(JSON.stringify({ error: insertError.message }), { status: 400, headers: corsHeaders })
  }

  // Assign role
  const { error: roleAssignError } = await supabaseAdmin
    .from('UserRoles')
    .insert({ FK_userId: newUser.id, FK_roleId: roleRow.id })

  if (roleAssignError) {
    await supabaseAdmin.from('Users').delete().eq('id', newUser.id)
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return new Response(JSON.stringify({ error: roleAssignError.message }), { status: 400, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ ...newUser, role }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
