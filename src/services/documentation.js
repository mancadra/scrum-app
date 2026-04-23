import { supabase } from "../config/supabase";

// ─── Helper: check project membership ────────────────────────────────────────

async function checkProjectMembership(projectId, userId) {
  const { data: memberships, error } = await supabase
    .from('ProjectUsers')
    .select('FK_projectRoleId')
    .eq('FK_projectId', projectId)
    .eq('FK_userId', userId)

  if (error) throw new Error(error.message)
  if (!memberships || memberships.length === 0) throw new Error('Niste član tega projekta.')
}

// ─── Get documentation ────────────────────────────────────────────────────────

export async function getDocumentation(projectId) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Niste prijavljeni.')

  await checkProjectMembership(projectId, user.id)

  const { data, error } = await supabase
    .from('Documentation')
    .select('id, content')
    .eq('FK_projectId', projectId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

// ─── Create empty documentation ──────────────────────────────────────────────

export async function createDocumentation(projectId) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Niste prijavljeni.')

  await checkProjectMembership(projectId, user.id)

  const { data: existing, error: fetchError } = await supabase
    .from('Documentation')
    .select('id')
    .eq('FK_projectId', projectId)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)
  if (existing) return existing

  const { data, error } = await supabase
    .from('Documentation')
    .insert({ FK_projectId: projectId, content: '' })
    .select('id, content')
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── Save (upsert) documentation ─────────────────────────────────────────────

export async function saveDocumentation(projectId, content) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Niste prijavljeni.')

  await checkProjectMembership(projectId, user.id)

  if (typeof content !== 'string') throw new Error('Vsebina mora biti besedilo.')

  // Check if documentation already exists for this project
  const { data: existing, error: fetchError } = await supabase
    .from('Documentation')
    .select('id')
    .eq('FK_projectId', projectId)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('Documentation')
      .update({ content })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('Documentation')
      .insert({ FK_ProjectId: projectId, content })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }
}

// ─── Import documentation from txt/markdown string ───────────────────────────
// Replaces existing content with imported content

export async function importDocumentation(projectId, content) {
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('Uvožena vsebina ne sme biti prazna.')
  }

  return await saveDocumentation(projectId, content)
}

// ─── Export documentation as markdown string ─────────────────────────────────
// Returns the raw markdown content ready to be downloaded as a .md file

export async function exportDocumentation(projectId) {
  const doc = await getDocumentation(projectId)

  if (!doc || !doc.content) throw new Error('Ni dokumentacije za izvoz.')

  return {
    filename: `documentation-${projectId}.md`,
    content: doc.content,
    mimeType: 'text/markdown',
  }
}