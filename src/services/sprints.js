import { supabase } from "../config/supabase";

// ─── Helper: fetch Slovenian public holidays for a given year ─────────────────

async function getSlovenianHolidays(year) {
  const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/SI`)
  if (!response.ok) throw new Error('Failed to fetch public holidays.')
  const holidays = await response.json()
  return new Set(holidays.map(h => h.date)) // Set of 'YYYY-MM-DD' strings
}

async function checkNotHoliday(date) {
  const dateStr = date.toISOString().split('T')[0] // 'YYYY-MM-DD'
  const year = date.getFullYear()
  const holidays = await getSlovenianHolidays(year)
  if (holidays.has(dateStr)) throw new Error(`Sprint se ne more začeti ali končati na praznik.`)
}

function checkNotWeekend(date) {
  const day = date.getDay() // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) throw new Error('Sprint se ne more začeti ali končati na vikend.')
}

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

  if (start < now) {
    throw new Error('Začetni datum mora biti v prihodnosti.')
  }

  if (end <= start) {
    throw new Error('Končni datum mora biti po začetnem datumu.')
  }

  checkNotWeekend(start)
  checkNotWeekend(end)
  await checkNotHoliday(start)
  await checkNotHoliday(end)

  // 8. Check for overlapping sprints...

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

async function checkSprintEditable(sprintId, userId) {
  const { data: sprint, error: sprintError } = await supabase
    .from('Sprints')
    .select('id, startingDate, endingDate, startingSpeed, FK_projectId')
    .eq('id', sprintId)
    .maybeSingle()

  if (sprintError) throw new Error(sprintError.message)
  if (!sprint) throw new Error('Sprint ni bil najden.')

  if (new Date(sprint.startingDate) <= new Date()) {
    throw new Error('Sprinta, ki se je že začel, ni mogoče urejati.')
  }

  const { data: memberships, error: memberError } = await supabase
    .from('ProjectUsers')
    .select('ProjectRoles(projectRole)')
    .eq('FK_projectId', sprint.FK_projectId)
    .eq('FK_userId', userId)

  if (memberError) throw new Error(memberError.message)
  if (!memberships || memberships.length === 0) throw new Error('Niste član tega projekta.')

  const roles = memberships.map(m => m.ProjectRoles?.projectRole)
  if (!roles.includes('Scrum Master')) {
    throw new Error('Samo skrbniki metodologije lahko urejajo sprinte.')
  }

  return sprint
}

export async function editSprint(sprintId, { startingDate, endingDate, startingSpeed }) {
  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)
  const user = data?.session?.user
  if (!user) throw new Error('Niste prijavljeni.')

  const sprint = await checkSprintEditable(sprintId, user.id)

  if (startingSpeed !== undefined) {
    if (!Number.isInteger(startingSpeed) || startingSpeed <= 0) {
      throw new Error('Začetna hitrost mora biti pozitivno celo število.')
    }
  }

  const start = startingDate ? new Date(startingDate) : new Date(sprint.startingDate)
  const end   = endingDate   ? new Date(endingDate)   : new Date(sprint.endingDate)
  const now   = new Date()

  if (start <= now) throw new Error('Začetni datum mora biti v prihodnosti.')
  if (end <= start) throw new Error('Končni datum mora biti po začetnem datumu.')

  checkNotWeekend(start)
  checkNotWeekend(end)
  await checkNotHoliday(start)
  await checkNotHoliday(end)

  const { data: overlapping, error: overlapError } = await supabase
    .from('Sprints')
    .select('id, startingDate, endingDate')
    .eq('FK_projectId', sprint.FK_projectId)
    .neq('id', sprintId)

  if (overlapError) throw new Error(overlapError.message)

  const hasOverlap = overlapping?.some(s => {
    const existingStart = new Date(s.startingDate)
    const existingEnd   = new Date(s.endingDate)
    return start <= existingEnd && end >= existingStart
  })

  if (hasOverlap) throw new Error('Datumi sprinta se prekrivajo z obstoječim sprintom v tem projektu.')

  const { data: updated, error } = await supabase
    .from('Sprints')
    .update({
      startingDate: start.toISOString(),
      endingDate: end.toISOString(),
      ...(startingSpeed !== undefined && { startingSpeed }),
    })
    .eq('id', sprintId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return updated
}

export async function deleteSprint(sprintId) {
  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)
  const user = data?.session?.user
  if (!user) throw new Error('Niste prijavljeni.')

  await checkSprintEditable(sprintId, user.id)

  // Unassign stories from the sprint first so tasks and logged hours are preserved.
  const { error: unassignError } = await supabase
    .from('SprintUserStories')
    .delete()
    .eq('FK_sprintId', sprintId)

  if (unassignError) throw new Error(unassignError.message)

  const { error } = await supabase
    .from('Sprints')
    .delete()
    .eq('id', sprintId)

  if (error) throw new Error(error.message)
  return true
}