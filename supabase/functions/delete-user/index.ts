import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  const { targetUserId } = await req.json()

  if (!targetUserId) {
    return new Response(JSON.stringify({ error: 'Manjka ID ciljnega uporabnika.' }), { status: 400, headers: corsHeaders })
  }

  // Prevent self-deletion
  if (targetUserId === user.id) {
    return new Response(
      JSON.stringify({ error: 'Lastnega računa ni mogoče izbrisati.' }),
      { status: 400, headers: corsHeaders }
    )
  }

  // Check if already deleted
  const { data: targetUser, error: targetError } = await supabaseAdmin
    .from('Users')
    .select('id, deleted_at')
    .eq('id', targetUserId)
    .maybeSingle()

  if (targetError || !targetUser) {
    return new Response(JSON.stringify({ error: 'Uporabnik ni bil najden.' }), { status: 404, headers: corsHeaders })
  }

  if (targetUser.deleted_at) {
    return new Response(JSON.stringify({ error: 'Uporabnik je že izbrisan.' }), { status: 409, headers: corsHeaders })
  }

  // Soft delete: set deleted_at timestamp
  const { error: softDeleteError } = await supabaseAdmin
    .from('Users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (softDeleteError) {
    return new Response(JSON.stringify({ error: softDeleteError.message }), { status: 400, headers: corsHeaders })
  }

  // Remove project memberships so they no longer appear on projects
  await supabaseAdmin.from('ProjectUsers').delete().eq('FK_userId', targetUserId)

  // Ban in Supabase auth so they cannot log in
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUserId,
    { ban_duration: '876600h' } // 100 years
  )

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
