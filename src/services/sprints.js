import { supabase } from "../config/supabase";

export async function getSprintsForProject(projectId) {
  const { data, error } = await supabase
    .from('Sprints')
    .select('id, startingDate, endingDate, startingSpeed')
    .eq('FK_projectId', projectId)
    .order('startingDate', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createSprint(projectId, { startingDate, endingDate, startingSpeed }) {

  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)
  const session = data?.session
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  const { data: memberships, error: memberError } = await supabase
    .from('ProjectUsers')
    .select('ProjectRoles(projectRole)')
    .eq('FK_projectId', projectId)
    .eq('FK_userId', user.id)

  if (memberError) throw new Error(memberError.message)
  if (!memberships || memberships.length === 0) throw new Error('You are not a member of this project.')

  const roles = memberships.map(m => m.ProjectRoles?.projectRole)
  if (!roles.includes('Scrum Master')) {
    throw new Error('Only Scrum Masters can create sprints.')
  }

  if (startingSpeed === undefined || startingSpeed === null) {
    throw new Error('Starting speed is required.')
  }
  if (!Number.isInteger(startingSpeed) || startingSpeed <= 0) {
    throw new Error('Starting speed must be a positive integer.')
  }

  if (!startingDate || !endingDate) {
    throw new Error('Starting and ending dates are required.')
  }

  const start = new Date(startingDate)
  const end = new Date(endingDate)
  const now = new Date()

  if (start <= now) {
    throw new Error('Starting date must be in the future.')
  }

  if (end <= start) {
    throw new Error('Ending date must be after starting date.')
  }

  const { data: overlapping, error: overlapError } = await supabase
    .from('Sprints')
    .select('id, startingDate, endingDate')
    .eq('FK_projectId', projectId)
    .or(`startingDate.lte.${end.toISOString()},endingDate.gte.${start.toISOString()}`)

  if (overlapError) throw new Error(overlapError.message)

  const hasOverlap = overlapping?.some(sprint => {
    const existingStart = new Date(sprint.startingDate)
    const existingEnd = new Date(sprint.endingDate)
    return start <= existingEnd && end >= existingStart
  })

  if (hasOverlap) {
    throw new Error('Sprint dates overlap with an existing sprint in this project.')
  }

  const { data: newSprint, error: sprintError } = await supabase
    .from('Sprints')
    .insert({
      FK_projectId: projectId,
      startingDate: start.toISOString(),
      endingDate: end.toISOString(),
      startingSpeed,
    })
    .select()
    .single()

  if (sprintError) throw new Error(sprintError.message)
  return newSprint
}