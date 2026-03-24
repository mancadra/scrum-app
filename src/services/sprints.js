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
  if (!user) throw new Error('Niste prijavljeni.')

  const { data: memberships, error: memberError } = await supabase
    .from('ProjectUsers')
    .select('ProjectRoles(projectRole)')
    .eq('FK_projectId', projectId)
    .eq('FK_userId', user.id)

  if (memberError) throw new Error(memberError.message)
  if (!memberships || memberships.length === 0) throw new Error('Niste član tega projekta.')

  const roles = memberships.map(m => m.ProjectRoles?.projectRole)
  if (!roles.includes('Scrum Master')) {
    throw new Error('Samo skrbniki metodologije lahko ustvarjajo sprinte.')
  }

  if (startingSpeed === undefined || startingSpeed === null) {
    throw new Error('Začetna hitrost je obvezna.')
  }
  if (!Number.isInteger(startingSpeed) || startingSpeed <= 0) {
    throw new Error('Začetna hitrost mora biti pozitivno celo število.')
  }

  if (!startingDate || !endingDate) {
    throw new Error('Začetni in končni datum sta obvezna.')
  }

  const start = new Date(startingDate)
  const end = new Date(endingDate)
  const now = new Date()

  if (start <= now) {
    throw new Error('Začetni datum mora biti v prihodnosti.')
  }

  if (end <= start) {
    throw new Error('Končni datum mora biti po začetnem datumu.')
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
    throw new Error('Datumi sprinta se prekrivajo z obstoječim sprintom v tem projektu.')
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