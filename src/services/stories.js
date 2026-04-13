import { supabase } from "../config/supabase";

export async function setTimeComplexity(storyId, timeComplexity) {
    // 1. Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) throw new Error('Niste prijavljeni.')

    // 2. Validate time complexity (must be a positive number)
    if (typeof timeComplexity !== 'number' || isNaN(timeComplexity) || timeComplexity <= 0) {
        throw new Error('Časovna zahtevnost mora biti pozitivno število.')
    }

    // 3. Fetch the story
    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .select('id, FK_projectId')
        .eq('id', storyId)
        .maybeSingle()

    if (storyError) throw new Error(storyError.message)
    if (!story) throw new Error('Uporabniška zgodba ni bila najdena.')

    // 4. Check user is a Scrum Master in this project
    const { data: memberships, error: memberError } = await supabase
        .from('ProjectUsers')
        .select('ProjectRoles(projectRole)')
        .eq('FK_projectId', story.FK_projectId)
        .eq('FK_userId', user.id)

    if (memberError) throw new Error(memberError.message)
    if (!memberships || memberships.length === 0) throw new Error('Niste član tega projekta.')

    const roles = memberships.map(m => m.ProjectRoles?.projectRole)
    if (!roles.includes('Scrum Master')) {
        throw new Error('Samo skrbniki metodologije lahko nastavljajo časovno zahtevnost.')
    }

    // 5. Check story is not already assigned to a sprint
    const { data: sprintLink, error: sprintLinkError } = await supabase
        .from('SprintUserStories')
        .select('FK_sprintId')
        .eq('FK_userStoryId', storyId)
        .maybeSingle()

    if (sprintLinkError) throw new Error(sprintLinkError.message)
    if (sprintLink) throw new Error('Ni mogoče nastaviti časovne zahtevnosti za zgodbo, ki je že dodeljena sprintu.')

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
  if (!user) throw new Error('Niste prijavljeni.')

  const { data: sprint, error: sprintError } = await supabase
    .from('Sprints')
    .select('id, FK_projectId')
    .eq('id', sprintId)
    .maybeSingle()

  if (sprintError) throw new Error(sprintError.message)
  if (!sprint) throw new Error('Sprint ni bil najden.')

  const { data: memberships, error: memberError } = await supabase
    .from('ProjectUsers')
    .select('ProjectRoles(projectRole)')
    .eq('FK_projectId', sprint.FK_projectId)
    .eq('FK_userId', user.id)

  if (memberError) throw new Error(memberError.message)
  if (!memberships || memberships.length === 0) throw new Error('Niste član tega projekta.')

  const roles = memberships.map(m => m.ProjectRoles?.projectRole)
  if (!roles.includes('Scrum Master')) {
    throw new Error('Samo skrbniki metodologije lahko dodajajo zgodbe v sprint.')
  }

  const { data: stories, error: storiesError } = await supabase
    .from('UserStories')
    .select('id, realized, timeComplexity')
    .in('id', storyIds)

  if (storiesError) throw new Error(storiesError.message)

  const realizedStories = stories.filter(s => s.realized)
  if (realizedStories.length > 0) {
    throw new Error(`Ni mogoče dodati realiziranih zgodb v sprint: ${realizedStories.map(s => s.id).join(', ')}`)
  }

  const unestimatedStories = stories.filter(s => !s.timeComplexity || s.timeComplexity <= 0)
  if (unestimatedStories.length > 0) {
    throw new Error(`Ni mogoče dodati zgodb brez ocene časovne zahtevnosti: ${unestimatedStories.map(s => s.id).join(', ')}`)
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
    throw new Error(`Nekatere zgodbe so že dodeljene aktivnemu sprintu: ${alreadyActive.map(l => l.FK_userStoryId).join(', ')}`)
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
    if (!user) throw new Error('Niste prijavljeni.')

    const { data: memberships, error: memberError } = await supabase
        .from('ProjectUsers')
        .select('ProjectRoles(projectRole)')
        .eq('FK_projectId', projectId)
        .eq('FK_userId', user.id)

    if (memberError) throw new Error(memberError.message)
    if (!memberships || memberships.length === 0) throw new Error('Niste član tega projekta.')

    const roles = memberships.map(m => m.ProjectRoles?.projectRole)
    if (!roles.includes('Product Owner') && !roles.includes('Scrum Master')) {
        throw new Error('Samo produktni vodje in skrbniki metodologije lahko ustvarjajo uporabniške zgodbe.')
    }

    if (!Number.isInteger(businessValue) || businessValue < 1 || businessValue > 10) {
        throw new Error('Poslovna vrednost mora biti celo število med 1 in 10.')
    }

    if (!priorityId) throw new Error('Prioriteta je obvezna.')

    const { data: existing, error: dupError } = await supabase
        .from('UserStories')
        .select('id')
        .eq('FK_projectId', projectId)
        .ilike('name', name)
        .maybeSingle()

    if (dupError) throw new Error(dupError.message)
    if (existing) throw new Error('Uporabniška zgodba s tem imenom že obstaja v tem projektu.')

    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .insert({ name, description, FK_projectId: projectId, FK_priorityId: priorityId, businessValue, accepted: false, realized: null, })
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
export async function markStoryRealized(storyId) {
  // 1. Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  // 2. Fetch the story
  const { data: story, error: storyError } = await supabase
    .from('UserStories')
    .select('id, realized, FK_projectId')
    .eq('id', storyId)
    .maybeSingle()

  if (storyError) throw new Error(storyError.message)
  if (!story) throw new Error('User story not found.')

  // 3. Check role — Product Owner only
  const { data: membership, error: memberError } = await supabase
    .from('ProjectUsers')
    .select('ProjectRoles(projectRole)')
    .eq('FK_projectId', story.FK_projectId)
    .eq('FK_userId', user.id)
    .maybeSingle()

  if (memberError) throw new Error(memberError.message)
  if (!membership) throw new Error('You are not a member of this project.')
  if (membership.ProjectRoles?.projectRole !== 'Product Owner') {
    throw new Error('Only Product Owners can mark stories as realized.')
  }

  // 4. Check already realized
  if (story.realized === true) throw new Error('Story is already marked as realized.')

  // 5. Check already rejected
  if (story.realized === false) throw new Error('Story has already been rejected.')

  // 6. Check story is in active sprint
  const now = new Date().toISOString()
  const { data: activeSprints, error: sprintError } = await supabase
    .from('Sprints')
    .select('id')
    .eq('FK_projectId', story.FK_projectId)
    .lte('startingDate', now)
    .gte('endingDate', now)

  if (sprintError) throw new Error(sprintError.message)
  if (!activeSprints || activeSprints.length === 0) throw new Error('No active sprint found.')

  const activeSprintIds = activeSprints.map(s => s.id)

  const { data: sprintLink, error: linkError } = await supabase
    .from('SprintUserStories')
    .select('FK_userStoryId')
    .eq('FK_userStoryId', storyId)
    .in('FK_sprintId', activeSprintIds)
    .maybeSingle()

  if (linkError) throw new Error(linkError.message)
  if (!sprintLink) throw new Error('Story is not part of the active sprint.')

  // 7. Mark as realized
  const { data, error: updateError } = await supabase
    .from('UserStories')
    .update({ realized: true })
    .eq('id', storyId)
    .select()
    .single()

  if (updateError) throw new Error(updateError.message)
  return data
}

export async function markStoryRejected(storyId) {
  // 1. Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  // 2. Fetch the story
  const { data: story, error: storyError } = await supabase
    .from('UserStories')
    .select('id, realized, FK_projectId')
    .eq('id', storyId)
    .maybeSingle()

  if (storyError) throw new Error(storyError.message)
  if (!story) throw new Error('User story not found.')

  // 3. Check role — Product Owner only
  const { data: membership, error: memberError } = await supabase
    .from('ProjectUsers')
    .select('ProjectRoles(projectRole)')
    .eq('FK_projectId', story.FK_projectId)
    .eq('FK_userId', user.id)
    .maybeSingle()

  if (memberError) throw new Error(memberError.message)
  if (!membership) throw new Error('You are not a member of this project.')
  if (membership.ProjectRoles?.projectRole !== 'Product Owner') {
    throw new Error('Only Product Owners can reject stories.')
  }

  // 4. Check already rejected
  if (story.realized === false) throw new Error('Story has already been rejected.')

  // 5. Check already realized
  if (story.realized === true) throw new Error('Story is already marked as realized.')

  // 6. Check story is in active sprint
  const now = new Date().toISOString()
  const { data: activeSprints, error: sprintError } = await supabase
    .from('Sprints')
    .select('id')
    .eq('FK_projectId', story.FK_projectId)
    .lte('startingDate', now)
    .gte('endingDate', now)

  if (sprintError) throw new Error(sprintError.message)
  if (!activeSprints || activeSprints.length === 0) throw new Error('No active sprint found.')

  const activeSprintIds = activeSprints.map(s => s.id)

  const { data: sprintLink, error: linkError } = await supabase
    .from('SprintUserStories')
    .select('FK_userStoryId')
    .eq('FK_userStoryId', storyId)
    .in('FK_sprintId', activeSprintIds)
    .maybeSingle()

  if (linkError) throw new Error(linkError.message)
  if (!sprintLink) throw new Error('Story is not part of the active sprint.')

  // 7. Mark as rejected
  const { data, error: updateError } = await supabase
    .from('UserStories')
    .update({ realized: false })
    .eq('id', storyId)
    .select()
    .single()

  if (updateError) throw new Error(updateError.message)
  return data
}

async function checkStoryEditable(storyId, userId) {
  // Fetch story
  const { data: story, error: storyError } = await supabase
    .from('UserStories')
    .select('id, name, FK_projectId, realized')
    .eq('id', storyId)
    .maybeSingle()

  if (storyError) throw new Error(storyError.message)
  if (!story) throw new Error('User story not found.')
  if (story.realized === true) throw new Error('Cannot modify a realized story.')

  // Check role
  const { data: membership, error: memberError } = await supabase
    .from('ProjectUsers')
    .select('ProjectRoles(projectRole)')
    .eq('FK_projectId', story.FK_projectId)
    .eq('FK_userId', userId)
    .maybeSingle()

  if (memberError) throw new Error(memberError.message)
  if (!membership) throw new Error('You are not a member of this project.')

  const role = membership.ProjectRoles?.projectRole
  if (role !== 'Product Owner' && role !== 'Scrum Master') {
    throw new Error('Only Product Owners and Scrum Masters can modify stories.')
  }

  // Check not assigned to any sprint
  const { data: sprintLink, error: linkError } = await supabase
    .from('SprintUserStories')
    .select('FK_userStoryId')
    .eq('FK_userStoryId', storyId)
    .maybeSingle()

  if (linkError) throw new Error(linkError.message)
  if (sprintLink) throw new Error('Cannot modify a story that has been assigned to a sprint.')

  return story
}

export async function editUserStory(storyId, { name, description, acceptanceTests, priorityId, businessValue, timeComplexity }) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  const story = await checkStoryEditable(storyId, user.id)

  // Check duplicate name
  if (name && name !== story.name) {
    const { data: existing, error: dupError } = await supabase
        .from('UserStories')
        .select('id')
        .eq('FK_projectId', story.FK_projectId)
        .eq('name', name)
        .maybeSingle()

    if (dupError) throw new Error(dupError.message)
    if (existing) throw new Error('A user story with this name already exists in this project.')
  }

    const { data, error } = await supabase
        .from('UserStories')
        .update({ name, description, FK_priorityId: priorityId, businessValue, timeComplexity })
        .eq('id', storyId)
        .select()
        .single()   

  if (error) throw new Error(error.message)
  return data
}

export async function deleteUserStory(storyId) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  await checkStoryEditable(storyId, user.id)

  const { error } = await supabase
    .from('UserStories')
    .delete()
    .eq('id', storyId)

  if (error) throw new Error(error.message)
  return true
}