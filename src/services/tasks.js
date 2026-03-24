import { supabase } from "../config/supabase";

export async function getSprintBacklog(projectId) {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw new Error(sessionError.message)
    const session = data?.session
    const user = session?.user
    if (!user) throw new Error('Niste prijavljeni.')

    const { data: memberships, error: memberError } = await supabase
        .from('ProjectUsers')
        .select('FK_projectRoleId')
        .eq('FK_projectId', projectId)
        .eq('FK_userId', user.id)

    if (memberError) throw new Error(memberError.message)
    if (!memberships || memberships.length === 0) throw new Error('Niste član tega projekta.')

    const now = new Date().toISOString()
    const { data: sprint, error: sprintError } = await supabase
        .from('Sprints')
        .select('*')
        .eq('FK_projectId', projectId)
        .lte('startingDate', now)
        .gte('endingDate', now)
        .maybeSingle()

    if (sprintError) throw new Error(sprintError.message)
    if (!sprint) throw new Error('Za ta projekt ni aktivnega sprinta.')

    const { data: sprintStories, error: storiesError } = await supabase
        .from('SprintUserStories')
        .select('UserStories(id, name, description, businessValue, realized, FK_priorityId, Priorities(priority))')
        .eq('FK_sprintId', sprint.id)

    if (storiesError) throw new Error(storiesError.message)

    const stories = sprintStories?.map(s => s.UserStories).filter(Boolean) ?? []
    const storyIds = stories.map(s => s.id)

    if (storyIds.length === 0) {
        return { sprint, stories: [] }
    }

    const { data: tasks, error: tasksError } = await supabase
        .from('Tasks')
        .select('*')
        .in('FK_userStoryId', storyIds)

    if (tasksError) throw new Error(tasksError.message)

    const taskIds = (tasks ?? []).map(t => t.id)
    let activeTaskIds = new Set()

    if (taskIds.length > 0) {
        const { data: openEntries, error: ttError } = await supabase
            .from('TimeTables')
            .select('FK_taskId')
            .in('FK_taskId', taskIds)
            .not('starttime', 'is', null)
            .is('stoptime', null)

        if (ttError) throw new Error(ttError.message)
        activeTaskIds = new Set(openEntries?.map(e => e.FK_taskId) ?? [])
    }

    const categorize = (task) => {
        if (task.finished) return 'finished'
        if (activeTaskIds.has(task.id)) return 'active'
        if (task.FK_acceptedDeveloper) return 'assigned'
        return 'unassigned'
    }

    const storyMap = new Map(stories.map(s => [
        s.id,
        { ...s, tasks: { unassigned: [], assigned: [], active: [], finished: [] } }
    ]))

    for (const task of (tasks ?? [])) {
        const story = storyMap.get(task.FK_userStoryId)
        if (!story) continue
        story.tasks[categorize(task)].push(task)
    }

    return { sprint, stories: Array.from(storyMap.values()) }
}

export const updateTaskStatus = async (taskId, newStatus) => {
  const { data, error } = await supabase
    .from('Tasks')
    .update({ status: newStatus })
    .eq('id', taskId);

  if (error) throw error;
  return data;
};

export async function getSprintBacklogById(projectId, sprintId) {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw new Error(sessionError.message)
    const session = data?.session
    const user = session?.user
    if (!user) throw new Error('Niste prijavljeni.')

    const { data: memberships, error: memberError } = await supabase
        .from('ProjectUsers')
        .select('FK_projectRoleId')
        .eq('FK_projectId', projectId)
        .eq('FK_userId', user.id)

    if (memberError) throw new Error(memberError.message)
    if (!memberships || memberships.length === 0) throw new Error('Niste član tega projekta.')

    const { data: sprint, error: sprintError } = await supabase
        .from('Sprints')
        .select('*')
        .eq('id', sprintId)
        .eq('FK_projectId', projectId)
        .maybeSingle()

    if (sprintError) throw new Error(sprintError.message)
    if (!sprint) throw new Error('Sprint ni bil najden.')

    const { data: sprintStories, error: storiesError } = await supabase
        .from('SprintUserStories')
        .select('UserStories(id, name, description, businessValue, realized, FK_priorityId, Priorities(priority))')
        .eq('FK_sprintId', sprint.id)

    if (storiesError) throw new Error(storiesError.message)

    const stories = sprintStories?.map(s => s.UserStories).filter(Boolean) ?? []
    const storyIds = stories.map(s => s.id)

    if (storyIds.length === 0) {
        return { sprint, stories: [] }
    }

    const { data: tasks, error: tasksError } = await supabase
        .from('Tasks')
        .select('*')
        .in('FK_userStoryId', storyIds)

    if (tasksError) throw new Error(tasksError.message)

    const taskIds = (tasks ?? []).map(t => t.id)
    let activeTaskIds = new Set()

    if (taskIds.length > 0) {
        const { data: openEntries, error: ttError } = await supabase
            .from('TimeTables')
            .select('FK_taskId')
            .in('FK_taskId', taskIds)
            .not('starttime', 'is', null)
            .is('stoptime', null)

        if (ttError) throw new Error(ttError.message)
        activeTaskIds = new Set(openEntries?.map(e => e.FK_taskId) ?? [])
    }

    const categorize = (task) => {
        if (task.finished) return 'finished'
        if (activeTaskIds.has(task.id)) return 'active'
        if (task.FK_acceptedDeveloper) return 'assigned'
        return 'unassigned'
    }

    const storyMap = new Map(stories.map(s => [
        s.id,
        { ...s, tasks: { unassigned: [], assigned: [], active: [], finished: [] } }
    ]))

    for (const task of (tasks ?? [])) {
        const story = storyMap.get(task.FK_userStoryId)
        if (!story) continue
        story.tasks[categorize(task)].push(task)
    }

    return { sprint, stories: Array.from(storyMap.values()) }
}

export async function createTask(userStoryId, { description, timecomplexity, FK_proposedDeveloper = null }) {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw new Error(sessionError.message)
    const session = data?.session
    const user = session?.user
    if (!user) throw new Error('Niste prijavljeni.')

    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .select('id, FK_projectId, realized')
        .eq('id', userStoryId)
        .maybeSingle()

    if (storyError) throw new Error(storyError.message)
    if (!story) throw new Error('Uporabniška zgodba ni bila najdena.')
    if (story.realized) throw new Error('Ni mogoče dodati nalog realizirani uporabniški zgodbi.')

    const { data: sprintLinks, error: sprintError } = await supabase
        .from('SprintUserStories')
        .select('FK_sprintId, Sprints(startingDate, endingDate)')
        .eq('FK_userStoryId', userStoryId)

    if (sprintError) throw new Error(sprintError.message)

    const now = new Date()
    const isInCurrentOrFutureSprint = sprintLinks?.some(link => {
        const end = link.Sprints?.endingDate ? new Date(link.Sprints.endingDate) : null
        return end && end >= now
    })

    if (!isInCurrentOrFutureSprint) throw new Error('Uporabniška zgodba ni del aktivnega ali prihodnjega sprinta.')

    const { data: memberships, error: memberError } = await supabase
        .from('ProjectUsers')
        .select('ProjectRoles(projectRole)')
        .eq('FK_projectId', story.FK_projectId)
        .eq('FK_userId', user.id)

    if (memberError) throw new Error(memberError.message)
    if (!memberships || memberships.length === 0) throw new Error('Niste član tega projekta.')

    const roles = memberships.map(m => m.ProjectRoles?.projectRole)
    if (!roles.includes('Scrum Master') && !roles.includes('Developer')) {
        throw new Error('Samo skrbniki metodologije in razvijalci lahko ustvarjajo naloge.')
    }

    const normalizedDescription = typeof description === 'string' ? description.trim() : '';
    if (!normalizedDescription) throw new Error('Opis je obvezen.')

    if (timecomplexity === undefined || timecomplexity === null) {
        throw new Error('Časovna zahtevnost je obvezna.')
    }
    if (typeof timecomplexity !== 'number' || isNaN(timecomplexity) || timecomplexity <= 0) {
        throw new Error('Časovna zahtevnost mora biti pozitivno število.')
    }

    if (FK_proposedDeveloper !== null) {
        const { data: devMemberships, error: devError } = await supabase
            .from('ProjectUsers')
            .select('ProjectRoles(projectRole)')
            .eq('FK_projectId', story.FK_projectId)
            .eq('FK_userId', FK_proposedDeveloper)

        if (devError) throw new Error(devError.message)
        if (!devMemberships || devMemberships.length === 0) throw new Error('Predlagani razvijalec ni član tega projekta.')

        const devRoles = devMemberships.map(m => m.ProjectRoles?.projectRole)
        if (!devRoles.includes('Developer')) {
            throw new Error('Predlagani razvijalec mora imeti vlogo razvijalca.')
        }
    }

    const { data: existing, error: dupError } = await supabase
        .from('Tasks')
        .select('id')
        .eq('FK_userStoryId', userStoryId)
        .ilike('description', normalizedDescription)
        .maybeSingle()

    if (dupError) throw new Error(dupError.message)
    if (existing) throw new Error('Naloga s tem opisom za to uporabniško zgodbo že obstaja.')

    const { data: task, error: taskError } = await supabase
        .from('Tasks')
        .insert({ description: normalizedDescription, timecomplexity, FK_userStoryId: userStoryId, FK_proposedDeveloper })
        .select()
        .single()

    if (taskError) throw new Error(taskError.message)
    return task
}

export async function finishTask(taskId) {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw new Error(sessionError.message)
    const session = data?.session
    const user = session?.user
    if (!user) throw new Error('Niste prijavljeni.')

    const { data: task, error: taskError } = await supabase
        .from('Tasks')
        .select('id, FK_acceptedDeveloper, finished')
        .eq('id', taskId)
        .maybeSingle()

    if (taskError) throw new Error(taskError.message)
    if (!task) throw new Error('Naloga ni bila najdena.')
    if (task.finished) throw new Error('Naloga je že zaključena.')
    if (task.FK_acceptedDeveloper !== user.id) throw new Error('Zaključite lahko samo nalogo, ki ste jo sprejeli.')

    // Close any open timetable entry for this task
    const now = new Date().toISOString()
    const { error: ttError } = await supabase
        .from('TimeTables')
        .update({ stoptime: now })
        .eq('FK_taskId', taskId)
        .eq('FK_userId', user.id)
        .is('stoptime', null)

    if (ttError) throw new Error(ttError.message)

    const { data: updated, error: updateError } = await supabase
        .from('Tasks')
        .update({ finished: true })
        .eq('id', taskId)
        .select()
        .single()

    if (updateError) throw new Error(updateError.message)
    return updated
}

export async function acceptTask(taskId) {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw new Error(sessionError.message)
    const session = data?.session
    const user = session?.user
    if (!user) throw new Error('Niste prijavljeni.')

    const { data: task, error: taskError } = await supabase
        .from('Tasks')
        .select('id, FK_userStoryId, FK_acceptedDeveloper, FK_proposedDeveloper, finished')
        .eq('id', taskId)
        .maybeSingle()

    if (taskError) throw new Error(taskError.message)
    if (!task) throw new Error('Naloga ni bila najdena.')
    if (task.finished) throw new Error('Ni mogoče sprejeti zaključene naloge.')
    if (task.FK_acceptedDeveloper) throw new Error('Nalogo je že sprejel drug razvijalec.')
    if (task.FK_proposedDeveloper && task.FK_proposedDeveloper !== user.id) {
        throw new Error('Ta naloga je bila predlagana drugemu razvijalcu.')
    }

    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .select('id, FK_projectId')
        .eq('id', task.FK_userStoryId)
        .maybeSingle()

    if (storyError) throw new Error(storyError.message)
    if (!story) throw new Error('Uporabniška zgodba ni bila najdena.')

    const { data: sprintLinks, error: sprintError } = await supabase
        .from('SprintUserStories')
        .select('FK_sprintId, Sprints(startingDate, endingDate)')
        .eq('FK_userStoryId', story.id)

    if (sprintError) throw new Error(sprintError.message)

    const now = new Date()
    const isInActiveSprint = sprintLinks?.some(link => {
        const start = link.Sprints?.startingDate ? new Date(link.Sprints.startingDate) : null
        const end = link.Sprints?.endingDate ? new Date(link.Sprints.endingDate) : null
        return start && end && start <= now && end >= now
    })

    if (!isInActiveSprint) throw new Error('Naloga ne pripada aktivnemu sprintu.')

    const { data: memberships, error: memberError } = await supabase
        .from('ProjectUsers')
        .select('ProjectRoles(projectRole)')
        .eq('FK_projectId', story.FK_projectId)
        .eq('FK_userId', user.id)

    if (memberError) throw new Error(memberError.message)
    if (!memberships || memberships.length === 0) throw new Error('Niste član tega projekta.')

    const roles = memberships.map(m => m.ProjectRoles?.projectRole)
    if (!roles.includes('Developer')) throw new Error('Samo razvijalci lahko sprejemajo naloge.')

    const { data: updated, error: updateError } = await supabase
        .from('Tasks')
        .update({ FK_acceptedDeveloper: user.id })
        .eq('id', taskId)
        .select()
        .single()

    if (updateError) throw new Error(updateError.message)
    return updated
}