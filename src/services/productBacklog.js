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

// ─── Helper: get authenticated user ──────────────────────────────────────────

async function getAuthenticatedUser() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Niste prijavljeni.')
  return user
}

// ─── 1. Realized stories ──────────────────────────────────────────────────────
// Stories where realized = true

export async function getRealizedStories(projectId) {
  const user = await getAuthenticatedUser()
  await checkProjectMembership(projectId, user.id)

  const { data, error } = await supabase
    .from('UserStories')
    .select('id, name, description, businessValue, timeComplexity, FK_priorityId, accepted')
    .eq('FK_projectId', projectId)
    .eq('realized', true)

  if (error) throw new Error(error.message)
  return data
}

// ─── 2. Assigned (but not realized) stories ───────────────────────────────────
// Stories that belong to an active sprint and are not realized

export async function getAssignedStories(projectId) {
  const user = await getAuthenticatedUser()
  await checkProjectMembership(projectId, user.id)

  const now = new Date().toISOString()

  // Find active or future sprints for this project (endingDate >= now)
  const { data: currentOrFutureSprints, error: sprintError } = await supabase
    .from('Sprints')
    .select('id')
    .eq('FK_projectId', projectId)
    .gte('endingDate', now)

  if (sprintError) throw new Error(sprintError.message)
  if (!currentOrFutureSprints || currentOrFutureSprints.length === 0) return []

  const sprintIds = currentOrFutureSprints.map(s => s.id)

  // Get story IDs linked to those sprints
  const { data: sprintLinks, error: linkError } = await supabase
    .from('SprintUserStories')
    .select('FK_userStoryId')
    .in('FK_sprintId', sprintIds)

  if (linkError) throw new Error(linkError.message)
  if (!sprintLinks || sprintLinks.length === 0) return []

  const assignedStoryIds = sprintLinks.map(l => l.FK_userStoryId)

  // Fetch the actual stories that are not realized
  const { data, error } = await supabase
    .from('UserStories')
    .select('id, name, description, businessValue, timeComplexity, FK_priorityId, accepted')
    .eq('FK_projectId', projectId)
    .eq('realized', false)
    .in('id', assignedStoryIds)

  if (error) throw new Error(error.message)
  return data
}

// ─── 3. Unassigned (and not realized) stories ─────────────────────────────────
// Stories that do not belong to any active sprint and are not realized

export async function getUnassignedStories(projectId) {
  const user = await getAuthenticatedUser()
  await checkProjectMembership(projectId, user.id)

  // Get ALL story IDs that are linked to any sprint (past, active, or future)
  const { data: allLinks, error: linkError } = await supabase
    .from('SprintUserStories')
    .select('FK_userStoryId, Sprints!inner(FK_projectId)')
    .eq('Sprints.FK_projectId', projectId)

  if (linkError) throw new Error(linkError.message)

  const assignedStoryIds = allLinks?.map(l => l.FK_userStoryId) ?? []

  // Fetch all unrealized stories not linked to any sprint
  let query = supabase
    .from('UserStories')
    .select('id, name, description, businessValue, timeComplexity, FK_priorityId, accepted')
    .eq('FK_projectId', projectId)
    .eq('realized', false)

  if (assignedStoryIds.length > 0) {
    query = query.not('id', 'in', `(${assignedStoryIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}