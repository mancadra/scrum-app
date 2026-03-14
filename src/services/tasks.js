import { supabase } from "../config/supabase";

export async function createTask(userStoryId, { description, timecomplexity, FK_proposedDeveloper = null }) {
    const { data: { session } } = await supabase.auth.getSession()
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

    if (!description || description.trim() === '') throw new Error('Description is required.')

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
        .eq('description', description)
        .maybeSingle()

    if (dupError) throw new Error(dupError.message)
    if (existing) throw new Error('A task with this description already exists for this user story.')

    const { data: task, error: taskError } = await supabase
        .from('Tasks')
        .insert({ description, timecomplexity, FK_userStoryId: userStoryId, FK_proposedDeveloper })
        .select()
        .single()

    if (taskError) throw new Error(taskError.message)
    return task
}
