import { supabase } from "../config/supabase";

export async function getPriorities() {
    const { data, error } = await supabase
        .from('Priorities')
        .select('id, priority')

    if (error) throw new Error(error.message)
    return data
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

    if (!Number.isInteger(businessValue) || businessValue < 0) {
        throw new Error('Business value must be a non-negative integer.')
    }

    if (!priorityId) throw new Error('Priority is required.')

    const { data: existing, error: dupError } = await supabase
        .from('UserStories')
        .select('id')
        .eq('FK_projectId', projectId)
        .eq('name', name)
        .maybeSingle()

    if (dupError) throw new Error(dupError.message)
    if (existing) throw new Error('A user story with this name already exists in this project.')

    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .insert({ name, description, FK_projectId: projectId, FK_priorityId: priorityId, businessValue })
        .select()
        .single()

    if (storyError) throw new Error(storyError.message)

    if (acceptanceTests && acceptanceTests.length > 0) {
        const tests = acceptanceTests.map(text => ({ description: text, FK_userStoryId: story.id }))
        const { error: testError } = await supabase
            .from('AcceptanceTests')
            .insert(tests)
        if (testError) throw new Error(testError.message)
    }

    return story
}
