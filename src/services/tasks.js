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
        .select('UserStories(id, name, description, businessValue, accepted, realized, testing, timeComplexity, FK_priorityId, Priorities(priority))')
        .eq('FK_sprintId', sprint.id)

    if (storiesError) throw new Error(storiesError.message)

    const stories = sprintStories?.map(s => s.UserStories).filter(Boolean) ?? []
    const storyIds = stories.map(s => s.id)

    if (storyIds.length === 0) {
        return { sprint, stories: [] }
    }

    const { data: tasks, error: tasksError } = await supabase
        .from('Tasks')
        .select('*, acceptedDev:FK_acceptedDeveloper(username, name, surname), proposedDev:FK_proposedDeveloper(username, name, surname)')
        .in('FK_userStoryId', storyIds)

    if (tasksError) throw new Error(tasksError.message)

    const taskIds = (tasks ?? []).map(t => t.id)
    let activeTaskIds = new Set()
    let storiesWithTimeLogs = new Set()

    if (taskIds.length > 0) {
        const { data: openEntries, error: ttError } = await supabase
            .from('TimeTables')
            .select('FK_taskId')
            .in('FK_taskId', taskIds)
            .not('starttime', 'is', null)
            .is('stoptime', null)

        if (ttError) throw new Error(ttError.message)
        activeTaskIds = new Set(openEntries?.map(e => e.FK_taskId) ?? [])

        const { data: anyLogEntries, error: anyLogError } = await supabase
            .from('TimeTables')
            .select('FK_taskId')
            .in('FK_taskId', taskIds)
            .not('starttime', 'is', null)

        if (anyLogError) throw new Error(anyLogError.message)
        const taskToStoryId = new Map((tasks ?? []).map(t => [t.id, t.FK_userStoryId]))
        storiesWithTimeLogs = new Set(
            (anyLogEntries ?? []).map(e => taskToStoryId.get(e.FK_taskId)).filter(Boolean)
        )
    }

    const categorize = (task) => {
        if (task.finished) return 'finished'
        if (activeTaskIds.has(task.id)) return 'active'
        if (task.FK_acceptedDeveloper) return 'assigned'
        return 'unassigned'
    }

    const storyMap = new Map(stories.map(s => [
        s.id,
        { ...s, hasTimeLogs: storiesWithTimeLogs.has(s.id), tasks: { unassigned: [], assigned: [], active: [], finished: [] } }
    ]))

    for (const task of (tasks ?? [])) {
        const story = storyMap.get(task.FK_userStoryId)
        if (!story) continue
        story.tasks[categorize(task)].push(task)
    }

    return { sprint, stories: Array.from(storyMap.values()) }
}

export function canAcceptTask(task, currentUserId, userProjectRoles) {
    if (!task || !!task.FK_acceptedDeveloper || task.finished) return false
    if (!userProjectRoles.includes('Developer')) return false
    return !task.FK_proposedDeveloper || task.FK_proposedDeveloper === currentUserId
}

export function canRejectTask(task, currentUserId) {
    if (!task || task.finished || !!task.FK_acceptedDeveloper) return false
    return task.FK_proposedDeveloper === currentUserId
}

export function categorizeStoryForKanban(story) {
    if (story.realized) return 'finished'
    if (story.testing) return 'testing'
    if (story.accepted || story.hasTimeLogs) return 'active'
    return 'unassigned'
}

export async function getProjectRolesForUser(projectId, userId) {
    const { data: memberships, error } = await supabase
        .from('ProjectUsers')
        .select('ProjectRoles(projectRole)')
        .eq('FK_projectId', projectId)
        .eq('FK_userId', userId)

    if (error) throw new Error(error.message)
    return memberships?.map(m => m.ProjectRoles?.projectRole).filter(Boolean) ?? []
}

export async function getProjectDevelopers(projectId) {
    const { data, error } = await supabase
        .from('ProjectUsers')
        .select('FK_userId, Users(id, username, name, surname, deleted_at), ProjectRoles(projectRole)')
        .eq('FK_projectId', projectId)
        .eq('ProjectRoles.projectRole', 'Developer')

    if (error) throw new Error(error.message)
    return (data ?? [])
        .filter(m => m.ProjectRoles?.projectRole === 'Developer' && m.Users && !m.Users.deleted_at)
        .map(m => ({
            id: m.FK_userId,
            username: m.Users.username,
            full_name: m.Users.name && m.Users.surname ? `${m.Users.name} ${m.Users.surname}` : null,
        }))
}

export async function getSprintNumber(projectId, sprintId) {
    const { data: allSprints, error } = await supabase
        .from('Sprints')
        .select('id, startingDate')
        .eq('FK_projectId', projectId)
        .order('startingDate', { ascending: true })

    if (error) throw new Error(error.message)
    if (!allSprints) return null
    const idx = allSprints.findIndex(s => String(s.id) === String(sprintId))
    return idx >= 0 ? idx + 1 : null
}

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
        .select('UserStories(id, name, description, businessValue, accepted, realized, testing, timeComplexity, FK_priorityId, Priorities(priority))')
        .eq('FK_sprintId', sprint.id)

    if (storiesError) throw new Error(storiesError.message)

    const stories = sprintStories?.map(s => s.UserStories).filter(Boolean) ?? []
    const storyIds = stories.map(s => s.id)

    if (storyIds.length === 0) {
        return { sprint, stories: [] }
    }

    const { data: tasks, error: tasksError } = await supabase
        .from('Tasks')
        .select('*, acceptedDev:FK_acceptedDeveloper(username, name, surname), proposedDev:FK_proposedDeveloper(username, name, surname)')
        .in('FK_userStoryId', storyIds)

    if (tasksError) throw new Error(tasksError.message)

    const taskIds = (tasks ?? []).map(t => t.id)
    let activeTaskIds = new Set()
    let storiesWithTimeLogs = new Set()

    if (taskIds.length > 0) {
        const { data: openEntries, error: ttError } = await supabase
            .from('TimeTables')
            .select('FK_taskId')
            .in('FK_taskId', taskIds)
            .not('starttime', 'is', null)
            .is('stoptime', null)

        if (ttError) throw new Error(ttError.message)
        activeTaskIds = new Set(openEntries?.map(e => e.FK_taskId) ?? [])

        const { data: anyLogEntries, error: anyLogError } = await supabase
            .from('TimeTables')
            .select('FK_taskId')
            .in('FK_taskId', taskIds)
            .not('starttime', 'is', null)

        if (anyLogError) throw new Error(anyLogError.message)
        const taskToStoryId = new Map((tasks ?? []).map(t => [t.id, t.FK_userStoryId]))
        storiesWithTimeLogs = new Set(
            (anyLogEntries ?? []).map(e => taskToStoryId.get(e.FK_taskId)).filter(Boolean)
        )
    }

    const categorize = (task) => {
        if (task.finished) return 'finished'
        if (activeTaskIds.has(task.id)) return 'active'
        if (task.FK_acceptedDeveloper) return 'assigned'
        return 'unassigned'
    }

    const storyMap = new Map(stories.map(s => [
        s.id,
        { ...s, hasTimeLogs: storiesWithTimeLogs.has(s.id), tasks: { unassigned: [], assigned: [], active: [], finished: [] } }
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

export async function getTaskLoggedHours(taskId) {
    const { data, error } = await supabase
        .from('TimeTables')
        .select('starttime, stoptime')
        .eq('FK_taskId', taskId)
        .not('starttime', 'is', null)

    if (error) throw new Error(error.message)

    const now = new Date()
    const totalMs = (data ?? []).reduce((sum, entry) => {
        const start = new Date(entry.starttime)
        const stop = entry.stoptime ? new Date(entry.stoptime) : now
        return sum + Math.max(0, stop - start)
    }, 0)

    return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100
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

export async function reopenTask(taskId) {
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
    if (!task.finished) throw new Error('Naloga ni zaključena.')
    if (task.FK_acceptedDeveloper !== user.id) throw new Error('Znova lahko odprete samo nalogo, ki ste jo zaključili.')

    const { data: updated, error: updateError } = await supabase
        .from('Tasks')
        .update({ finished: false })
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

    if (task.FK_proposedDeveloper && task.FK_proposedDeveloper !== user.id) {
        throw new Error('Ta naloga je bila predlagana drugemu razvijalcu.')
    }

    const { data: updated, error: updateError } = await supabase
        .from('Tasks')
        .update({ FK_acceptedDeveloper: user.id })
        .eq('id', taskId)
        .select()
        .single()

    if (updateError) throw new Error(updateError.message)
    return updated
}

export async function rejectTask(taskId) {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw new Error(sessionError.message)
    const user = data?.session?.user
    if (!user) throw new Error('Niste prijavljeni.')

    const { data: task, error: taskError } = await supabase
        .from('Tasks')
        .select('id, FK_userStoryId, FK_proposedDeveloper, FK_acceptedDeveloper, finished')
        .eq('id', taskId)
        .maybeSingle()

    if (taskError) throw new Error(taskError.message)
    if (!task) throw new Error('Naloga ni bila najdena.')
    if (task.finished) throw new Error('Ni mogoče zavrniti zaključene naloge.')
    if (task.FK_acceptedDeveloper) throw new Error('Ni mogoče zavrniti že sprejete naloge.')
    if (task.FK_proposedDeveloper !== user.id) throw new Error('Zavrnite lahko samo naloge, predlagane vam.')

    const { data: sprintLinks, error: sprintError } = await supabase
        .from('SprintUserStories')
        .select('FK_sprintId, Sprints(startingDate, endingDate)')
        .eq('FK_userStoryId', task.FK_userStoryId)

    if (sprintError) throw new Error(sprintError.message)

    const now = new Date()
    const isInActiveSprint = sprintLinks?.some(link => {
        const start = link.Sprints?.startingDate ? new Date(link.Sprints.startingDate) : null
        const end = link.Sprints?.endingDate ? new Date(link.Sprints.endingDate) : null
        return start && end && start <= now && end >= now
    })

    if (!isInActiveSprint) throw new Error('Naloga ne pripada aktivnemu sprintu.')

    const { data: updated, error: updateError } = await supabase
        .from('Tasks')
        .update({ FK_proposedDeveloper: null })
        .eq('id', taskId)
        .select()
        .single()

    if (updateError) throw new Error(updateError.message)
    return updated
}
