import { supabase } from "../config/supabase";

export async function getSprintBacklog(projectId) {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw new Error(sessionError.message)
    const session = data?.session
    const user = session?.user
    if (!user) throw new Error('Not authenticated.')

    const { data: membership, error: memberError } = await supabase
        .from('ProjectUsers')
        .select('FK_projectRoleId')
        .eq('FK_projectId', projectId)
        .eq('FK_userId', user.id)
        .maybeSingle()

    if (memberError) throw new Error(memberError.message)
    if (!membership) throw new Error('You are not a member of this project.')

    const now = new Date().toISOString()
    const { data: sprint, error: sprintError } = await supabase
        .from('Sprints')
        .select('*')
        .eq('FK_projectId', projectId)
        .lte('startingDate', now)
        .gte('endingDate', now)
        .maybeSingle()

    if (sprintError) throw new Error(sprintError.message)
    if (!sprint) throw new Error('No active sprint found for this project.')

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
    if (!user) throw new Error('Not authenticated.')

    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .select('id, FK_projectId, realized')
        .eq('id', userStoryId)
        .maybeSingle()

    if (storyError) throw new Error(storyError.message)
    if (!story) throw new Error('User story not found.')
    if (story.realized) throw new Error('Cannot add tasks to a realized user story.')

    const { data: sprintLinks, error: sprintError } = await supabase
        .from('SprintUserStories')
        .select('FK_sprintId, Sprints(startingDate, endingDate)')
        .eq('FK_userStoryId', userStoryId)

    if (sprintError) throw new Error(sprintError.message)

    const now = new Date()
    const isInActiveSprint = sprintLinks?.some(link => {
        const start = link.Sprints?.startingDate ? new Date(link.Sprints.startingDate) : null
        const end = link.Sprints?.endingDate ? new Date(link.Sprints.endingDate) : null
        return start && end && start <= now && end >= now
    })

    if (!isInActiveSprint) throw new Error('User story is not part of an active sprint.')

    const { data: membership, error: memberError } = await supabase
        .from('ProjectUsers')
        .select('FK_projectRoleId, ProjectRoles(projectRole)')
        .eq('FK_projectId', story.FK_projectId)
        .eq('FK_userId', user.id)
        .maybeSingle()

    if (memberError) throw new Error(memberError.message)
    if (!membership) throw new Error('You are not a member of this project.')

    const role = membership.ProjectRoles?.projectRole
    if (role !== 'Scrum Master' && role !== 'Developer') {
        throw new Error('Only Scrum Masters and Developers can create tasks.')
    }

    const normalizedDescription = typeof description === 'string' ? description.trim() : '';
    if (!normalizedDescription) throw new Error('Description is required.')

    if (timecomplexity === undefined || timecomplexity === null) {
        throw new Error('Time complexity is required.')
    }
    if (!Number.isInteger(timecomplexity) || timecomplexity <= 0) {
        throw new Error('Time complexity must be a positive integer.')
    }

    if (FK_proposedDeveloper !== null) {
        const { data: devMembership, error: devError } = await supabase
            .from('ProjectUsers')
            .select('FK_projectRoleId, ProjectRoles(projectRole)')
            .eq('FK_projectId', story.FK_projectId)
            .eq('FK_userId', FK_proposedDeveloper)
            .maybeSingle()

        if (devError) throw new Error(devError.message)
        if (!devMembership) throw new Error('Proposed developer is not a member of this project.')

        const devRole = devMembership.ProjectRoles?.projectRole
        if (devRole !== 'Developer') {
            throw new Error('Proposed developer must have the Developer role.')
        }
    }

    const { data: existing, error: dupError } = await supabase
        .from('Tasks')
        .select('id')
        .eq('FK_userStoryId', userStoryId)
        .eq('description', normalizedDescription)
        .maybeSingle()

    if (dupError) throw new Error(dupError.message)
    if (existing) throw new Error('A task with this description already exists for this user story.')

    const { data: task, error: taskError } = await supabase
        .from('Tasks')
        .insert({ description: normalizedDescription, timecomplexity, FK_userStoryId: userStoryId, FK_proposedDeveloper })
        .select()
        .single()

    if (taskError) throw new Error(taskError.message)
    return task
}
