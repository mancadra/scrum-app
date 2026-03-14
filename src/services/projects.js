import { supabase } from "../config/supabase";

export async function getUsers() {
    const { data, error } = await supabase
        .from('Users')
        .select('id, username, name, surname')
        .order('username')

    if (error) throw new Error(error.message)
    return data
}

export async function getProjectRoles() {
    const { data, error } = await supabase
        .from('ProjectRoles')
        .select('id, projectRole')

    if (error) throw new Error(error.message)
    return data
}

export async function getProjectUsers(projectId) {
    const { data, error } = await supabase
        .from('ProjectUsers')
        .select('FK_userId, FK_projectRoleId, Users(username, name, surname), ProjectRoles(projectRole)')
        .eq('FK_projectId', projectId)

    if (error) throw new Error(error.message)
    return data
}

export async function getProjects() {
    const { data, error } = await supabase
        .from('Projects')
        .select('*, ProjectUsers(FK_userId, FK_projectRoleId, Users(username, name, surname), ProjectRoles(projectRole))')
        .order('name')

    if (error) throw new Error(error.message)
    return data
}

export async function createProject(name, description, users) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw new Error(sessionError.message)
    const user = session?.user
    if (!user) throw new Error('Not authenticated.')

    const { data: roleData, error: roleError } = await supabase
        .from('UserRoles')
        .select('Roles(name)')
        .eq('FK_userId', user.id)

    if (roleError) throw new Error(roleError.message)

    const isAdmin = roleData?.some(r => r.Roles?.name === 'Admin')
    if (!isAdmin) throw new Error('Only admins can create projects.')

    const { data: project, error: projectError } = await supabase
        .from('Projects')
        .insert({ name, description })
        .select()
        .single()

    if (projectError) throw new Error(projectError.message)

    if (users && users.length > 0) {
        const projectUsers = users.map((user) => ({
            FK_projectId: project.id,
            FK_userId: user.id,
            FK_projectRoleId: user.projectRoleId,
        }))

        const { error: usersError } = await supabase
            .from('ProjectUsers')
            .insert(projectUsers)

        if (usersError) throw new Error(usersError.message)
    }

    return project
}
