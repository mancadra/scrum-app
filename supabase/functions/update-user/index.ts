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
  if (password.length < 12) throw new Error('Geslo mora imeti vsaj 12 znakov.')
  if (password.length > 128) throw new Error('Geslo ne sme presegati 128 znakov.')
  if (/  /.test(password)) throw new Error('Geslo ne sme vsebovati zaporednih presledkov.')
  if (TOP_100_PASSWORDS.has(password.toLowerCase())) throw new Error('Geslo je preveč pogosto.')
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

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  // Verify requesting user
  const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  // Check admin
  const { data: roleData } = await supabaseAdmin
    .from('UserRoles')
    .select('Roles(name)')
    .eq('FK_userId', user.id)

  const isAdmin = roleData?.some((r: any) => r.Roles?.name === 'Admin')
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Dostop zavrnjen. To dejanje je dovoljeno samo administratorjem.' }),
      { status: 403, headers: corsHeaders }
    )
  }

  const { targetUserId, username, email, firstName, lastName, role, password } = await req.json()

  if (!targetUserId) {
    return new Response(JSON.stringify({ error: 'Manjka ID ciljnega uporabnika.' }), { status: 400, headers: corsHeaders })
  }

  // Verify target user exists
  const { data: targetUser, error: targetError } = await supabaseAdmin
    .from('Users')
    .select('id, username, email')
    .eq('id', targetUserId)
    .maybeSingle()

  if (targetError || !targetUser) {
    return new Response(JSON.stringify({ error: 'Uporabnik ni bil najden.' }), { status: 404, headers: corsHeaders })
  }

  // Check username uniqueness if changing it
  if (username && username !== targetUser.username) {
    const { data: existing } = await supabaseAdmin
      .from('Users')
      .select('id, deleted_at')
      .ilike('username', username)
      .neq('id', targetUserId)
      .maybeSingle()

    if (existing) {
      const message = existing.deleted_at
        ? `Uporabniško ime "${username}" pripada izbrisanemu uporabniku in ga ni mogoče ponovno uporabiti.`
        : `Uporabniško ime "${username}" je že zasedeno.`
      return new Response(
        JSON.stringify({ error: message }),
        { status: 409, headers: corsHeaders }
      )
    }
  }

  // Check email uniqueness if changing it
  if (email && email !== targetUser.email) {
    const { data: existingEmail } = await supabaseAdmin
      .from('Users')
      .select('id, deleted_at')
      .eq('email', email)
      .neq('id', targetUserId)
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
  }

  // Validate password if provided
  if (password) {
    try {
      validatePassword(password)
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders })
    }
  }

  // Update public Users table
  const profileUpdate: Record<string, any> = {}
  if (username)   profileUpdate.username = username
  if (email)      profileUpdate.email    = email
  if (firstName)  profileUpdate.name     = firstName
  if (lastName)   profileUpdate.surname  = lastName

  if (Object.keys(profileUpdate).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('Users')
      .update(profileUpdate)
      .eq('id', targetUserId)

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 400, headers: corsHeaders })
    }
  }

  // Update auth user (email and/or password)
  const authUpdate: Record<string, any> = {}
  if (email)    authUpdate.email    = email
  if (password) authUpdate.password = password

  if (Object.keys(authUpdate).length > 0) {
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      authUpdate
    )
    if (authUpdateError) {
      return new Response(JSON.stringify({ error: authUpdateError.message }), { status: 400, headers: corsHeaders })
    }
  }

  // Update role if provided
  if (role) {
    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from('Roles')
      .select('id')
      .eq('name', role)
      .single()

    if (roleError || !roleRow) {
      return new Response(JSON.stringify({ error: `Vloga "${role}" ni bila najdena.` }), { status: 400, headers: corsHeaders })
    }

    // Replace existing role
    await supabaseAdmin.from('UserRoles').delete().eq('FK_userId', targetUserId)

    const { error: roleAssignError } = await supabaseAdmin
      .from('UserRoles')
      .insert({ FK_userId: targetUserId, FK_roleId: roleRow.id })

    if (roleAssignError) {
      return new Response(JSON.stringify({ error: roleAssignError.message }), { status: 400, headers: corsHeaders })
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
