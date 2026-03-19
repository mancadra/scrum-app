import { supabase } from "../config/supabase";

export async function setTimeComplexity(storyId, timeComplexity) {
    // 1. Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) throw new Error('Not authenticated.')

    // 2. Validate time complexity (must be a positive number)
    if (typeof timeComplexity !== 'number' || isNaN(timeComplexity) || timeComplexity <= 0) {
        throw new Error('Time complexity must be a positive number.')
    }

    // 3. Fetch the story
    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .select('id, FK_projectId')
        .eq('id', storyId)
        .maybeSingle()

    if (storyError) throw new Error(storyError.message)
    if (!story) throw new Error('User story not found.')

    // 4. Check user is a Scrum Master in this project
    const { data: membership, error: memberError } = await supabase
        .from('ProjectUsers')
        .select('FK_projectRoleId, ProjectRoles(projectRole)')
        .eq('FK_projectId', story.FK_projectId)
        .eq('FK_userId', user.id)
        .maybeSingle()

    if (memberError) throw new Error(memberError.message)
    if (!membership) throw new Error('You are not a member of this project.')

    const role = membership.ProjectRoles?.projectRole
    if (role !== 'Scrum Master') {
        throw new Error('Only Scrum Masters can set time complexity.')
    }

    // 5. Check story is not already assigned to a sprint
    const { data: sprintLink, error: sprintLinkError } = await supabase
        .from('SprintUserStories')
        .select('FK_sprintId')
        .eq('FK_userStoryId', storyId)
        .maybeSingle()

    if (sprintLinkError) throw new Error(sprintLinkError.message)
    if (sprintLink) throw new Error('Cannot set time complexity on a story that is already assigned to a sprint.')

    // 6. Update time complexity
    const { data: updated, error: updateError } = await supabase
        .from('UserStories')
        .update({ timeComplexity })
        .eq('id', storyId)
        .select()
        .single()

    if (updateError) throw new Error(updateError.message)
    return updated
}

export async function getPriorities() {
    const { data, error } = await supabase
        .from('Priorities')
        .select('id, priority')

    if (error) throw new Error(error.message)
    return data
}

export async function addStoriesToSprint(sprintId, storyIds) {

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  const { data: sprint, error: sprintError } = await supabase
    .from('Sprints')
    .select('id, FK_projectId')
    .eq('id', sprintId)
    .maybeSingle()

  if (sprintError) throw new Error(sprintError.message)
  if (!sprint) throw new Error('Sprint not found.')

  const { data: membership, error: memberError } = await supabase
    .from('ProjectUsers')
    .select('FK_projectRoleId, ProjectRoles(projectRole)')
    .eq('FK_projectId', sprint.FK_projectId)
    .eq('FK_userId', user.id)
    .maybeSingle()

  if (memberError) throw new Error(memberError.message)
  if (!membership) throw new Error('You are not a member of this project.')

  const role = membership.ProjectRoles?.projectRole
  if (role !== 'Scrum Master') {
    throw new Error('Only Scrum Masters can add stories to a sprint.')
  }

  const { data: stories, error: storiesError } = await supabase
    .from('UserStories')
    .select('id, realized, timeComplexity')
    .in('id', storyIds)

  if (storiesError) throw new Error(storiesError.message)

  const realizedStories = stories.filter(s => s.realized)
  if (realizedStories.length > 0) {
    throw new Error(`Cannot add realized stories to a sprint: ${realizedStories.map(s => s.id).join(', ')}`)
  }

  const unestimatedStories = stories.filter(s => !s.timeComplexity || s.timeComplexity <= 0)
  if (unestimatedStories.length > 0) {
    throw new Error(`Cannot add stories without time complexity estimate: ${unestimatedStories.map(s => s.id).join(', ')}`)
  }

  const now = new Date().toISOString()

  const { data: activeLinks, error: activeLinkError } = await supabase
    .from('SprintUserStories')
    .select('FK_userStoryId, Sprints(startingDate, endingDate)')
    .in('FK_userStoryId', storyIds)

  if (activeLinkError) throw new Error(activeLinkError.message)

  const alreadyActive = activeLinks?.filter(link => {
    const start = link.Sprints?.startingDate ? new Date(link.Sprints.startingDate) : null
    const end = link.Sprints?.endingDate ? new Date(link.Sprints.endingDate) : null
    const nowDate = new Date(now)
    return start && end && start <= nowDate && end >= nowDate
  })

  if (alreadyActive.length > 0) {
    throw new Error(`Some stories are already assigned to an active sprint: ${alreadyActive.map(l => l.FK_userStoryId).join(', ')}`)
  }

  const inserts = storyIds.map(storyId => ({
    FK_sprintId: sprintId,
    FK_userStoryId: storyId,
  }))

  const { data: result, error: insertError } = await supabase
    .from('SprintUserStories')
    .insert(inserts)
    .select()

  if (insertError) throw new Error(insertError.message)
  return result
}

export async function createUserStory(projectId, { name, description, acceptanceTests, priorityId, businessValue }) {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) throw new Error('Not authenticated.')

    const { data: membership, error: memberError } = await supabase
        .from('ProjectUsers')
        .select('FK_projectRoleId, ProjectRoles(projectRole)')
        .eq('FK_projectId', projectId)
        .eq('FK_userId', user.id)
        .maybeSingle()

    if (memberError) throw new Error(memberError.message)
    if (!membership) throw new Error('You are not a member of this project.')

    const role = membership.ProjectRoles?.projectRole
    if (role !== 'Product Owner' && role !== 'Scrum Master') {
        throw new Error('Only Product Owners and Scrum Masters can create user stories.')
    }

    if (!Number.isInteger(businessValue) || businessValue < 1 || businessValue > 10) {
        throw new Error('Business value must be an integer between 1 and 10.')
    }

    if (!priorityId) throw new Error('Priority is required.')

    const { data: existing, error: dupError } = await supabase
        .from('UserStories')
        .select('id')
        .eq('FK_projectId', projectId)
        .ilike('name', name)
        .maybeSingle()

    if (dupError) throw new Error(dupError.message)
    if (existing) throw new Error('A user story with this name already exists in this project.')

    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .insert({ name, description, FK_projectId: projectId, FK_priorityId: priorityId, businessValue, accepted: false, realized: false, })
        .select()
        .single()

    if (storyError) throw new Error(storyError.message)

    if (acceptanceTests && acceptanceTests.length > 0) {
        const tests = acceptanceTests.map(text => ({ description: text, FK_userStoryId: story.id }))
        const { error: testError } = await supabase
            .from('AcceptanceTests')
            .insert(tests)

        if (testError) {
            // Compensate for failure by deleting the previously created UserStory
            await supabase
                .from('UserStories')
                .delete()
                .eq('id', story.id)

            throw new Error(testError.message)
        }
    }

    return story
}       
    
export async function getStoriesForProject(projectId) {
    const { data, error } = await supabase                                                                   
        .from('UserStories')
        .select(`
            id, name, description, businessValue, timeComplexity, accepted, realized,                        
            Priorities(priority), SprintUserStories(FK_sprintId)                                                                   
        `).eq('FK_projectId', projectId)
        .order('id')                                                                                         
    if (error) throw new Error(error.message)

    return data.map(story => ({
        ...story,                                                                                            
        priority: story.Priorities?.priority ?? null,
        sprintId: story.SprintUserStories?.[0]?.FK_sprintId ?? null,
        category: story.realized ? 'realized'
            : story.SprintUserStories?.length > 0 ? 'assigned'
                : 'unassigned',                                                                               
    }))
}
