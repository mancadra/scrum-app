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
    .select(`
      id, name, description, businessValue, timeComplexity, FK_priorityId, accepted,
      AcceptanceTests(id, description)
    `)
    .eq('FK_projectId', projectId)
    .eq('realized', true)

  if (error) throw new Error(error.message)
  return (data ?? []).map(story => ({
    ...story,
    acceptanceTests: story.AcceptanceTests?.map(test => test.description) ?? [],
  }))
}

// ─── 2. Assigned (but not realized) stories ───────────────────────────────────
// Stories that belong to an active sprint and are not realized

export async function getAssignedStories(projectId) {
  const user = await getAuthenticatedUser()
  await checkProjectMembership(projectId, user.id)

  const now = new Date().toISOString()

  // Find active sprints for this project (startingDate <= now <= endingDate)
  const { data: activeSprints, error: sprintError } = await supabase
    .from('Sprints')
    .select('id')
    .eq('FK_projectId', projectId)
    .lte('startingDate', now)
    .gte('endingDate', now)

  if (sprintError) throw new Error(sprintError.message)
  if (!activeSprints || activeSprints.length === 0) return []

  const sprintIds = activeSprints.map(s => s.id)

  // Get story IDs linked to those sprints
  const { data: sprintLinks, error: linkError } = await supabase
    .from('SprintUserStories')
    .select('FK_userStoryId')
    .in('FK_sprintId', sprintIds)

  if (linkError) throw new Error(linkError.message)
  if (!sprintLinks || sprintLinks.length === 0) return []

  const assignedStoryIds = sprintLinks.map(l => l.FK_userStoryId)

  // Fetch the actual stories that are not realized (null = in progress, false = rejected)
  const { data, error } = await supabase
    .from('UserStories')
    .select(`
      id, name, description, businessValue, timeComplexity, FK_priorityId, accepted,
      AcceptanceTests(id, description)
    `)
    .eq('FK_projectId', projectId)
    .or('realized.is.null,realized.eq.false')
    .in('id', assignedStoryIds)

  if (error) throw new Error(error.message)
  return (data ?? []).map(story => ({
    ...story,
    acceptanceTests: story.AcceptanceTests?.map(test => test.description) ?? [],
  }))
}

// ─── 3. Unassigned (and not realized) stories ─────────────────────────────────
// Stories that do not belong to any active sprint and are not realized

export async function getUnassignedStories(projectId) {
  const user = await getAuthenticatedUser()
  await checkProjectMembership(projectId, user.id)

  const now = new Date().toISOString()

  // Get story IDs that are linked to active sprints only
  const { data: activeLinks, error: linkError } = await supabase
    .from('SprintUserStories')
    .select('FK_userStoryId, Sprints!inner(FK_projectId, startingDate, endingDate)')
    .eq('Sprints.FK_projectId', projectId)
    .lte('Sprints.startingDate', now)
    .gte('Sprints.endingDate', now)

  if (linkError) throw new Error(linkError.message)

  const activeAssignedStoryIds = activeLinks?.map(l => l.FK_userStoryId) ?? []

  // Fetch all unrealized stories not linked to an active sprint
  let query = supabase
    .from('UserStories')
    .select(`
      id, name, description, businessValue, timeComplexity, FK_priorityId, accepted,
      AcceptanceTests(id, description)
    `)
    .eq('FK_projectId', projectId)
    .or('realized.is.null,realized.eq.false')

  if (activeAssignedStoryIds.length > 0) {
    query = query.not('id', 'in', `(${activeAssignedStoryIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}