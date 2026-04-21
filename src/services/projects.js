import { supabase } from "../config/supabase";

export async function getUsers() {
    const { data, error } = await supabase
        .from('Users')
        .select('id, username, name, surname, email, UserRoles(Roles(name))')
        .is('deleted_at', null)
        .order('username')

    if (error) throw new Error(error.message)
    return data
}

export async function getUsersProjects(userId) {
    const { data, error } = await supabase
        .from('ProjectUsers')
        .select('Projects(id, name, description)')
        .eq('FK_userId', userId)

    if (error) throw new Error(error.message)
    const seen = new Set()
    return data.map(row => row.Projects).filter(p => {
        if (!p || seen.has(p.id)) return false
        seen.add(p.id)
        return true
    })
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
    if (!user) throw new Error('Niste prijavljeni.')

    const { data: roleData, error: roleError } = await supabase
        .from('UserRoles')
        .select('Roles(name)')
        .eq('FK_userId', user.id)

    if (roleError) throw new Error(roleError.message)

    const isAdmin = roleData?.some(r => r.Roles?.name === 'Admin')
    if (!isAdmin) throw new Error('Samo administratorji lahko ustvarjajo projekte.')

    const { data: existing, error: dupError } = await supabase
        .from('Projects')
        .select('id')
        .ilike('name', name)
        .maybeSingle()

    if (dupError) throw new Error(dupError.message)
    if (existing) throw new Error(`Projekt z imenom "${name}" že obstaja.`)

    const { data: project, error: projectError } = await supabase
        .from('Projects')
        .insert({ name, description })
        .select()
        .single()

    if (projectError) throw new Error(projectError.message)

    if (users && users.length > 0) {
        const projectUsers = users.flatMap((projectUser) =>
            projectUser.projectRoleIds.map((roleId) => ({
                FK_projectId: project.id,
                FK_userId: projectUser.id,
                FK_projectRoleId: roleId,
            }))
        )

        if (projectUsers.length > 0) {
            const { error: usersError } = await supabase
                .from('ProjectUsers')
                .insert(projectUsers)

            if (usersError) throw new Error(usersError.message)
        }
    }

    return project
}

export async function saveProjectMembers(projectId, desiredMembers) {
  // desiredMembers: Array<{ userId: string, roleIds: number[] }>
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  await checkProjectAdmin(projectId, user.id)

  const { data: allRoles, error: rolesError } = await supabase
    .from('ProjectRoles')
    .select('id, projectRole')
  if (rolesError) throw new Error(rolesError.message)

  const poRole = allRoles.find(r => r.projectRole === 'Product Owner')
  const smRole = allRoles.find(r => r.projectRole === 'Scrum Master')

  const poCount = desiredMembers.filter(m => m.roleIds.includes(poRole?.id)).length
  const smCount = desiredMembers.filter(m => m.roleIds.includes(smRole?.id)).length

  if (poCount === 0) throw new Error('Projekt mora imeti vsaj enega Produktnega vodjo.')
  if (smCount === 0) throw new Error('Projekt mora imeti vsaj enega Skrbnika metodologije.')
  if (poCount > 1) throw new Error('Projekt lahko ima samo enega Produktnega vodjo.')
  if (smCount > 1) throw new Error('Projekt lahko ima samo enega Skrbnika metodologije.')

  const noRole = desiredMembers.find(m => m.roleIds.length === 0)
  if (noRole) throw new Error('Vsak član mora imeti vsaj eno vlogo.')

  const { data: currentMembers, error: currentError } = await supabase
    .from('ProjectUsers')
    .select('FK_userId, FK_projectRoleId')
    .eq('FK_projectId', projectId)
  if (currentError) throw new Error(currentError.message)

  const currentSet = new Set(currentMembers.map(m => `${m.FK_userId}:${m.FK_projectRoleId}`))

  const desiredPairs = []
  const desiredSet = new Set()
  for (const m of desiredMembers) {
    for (const roleId of m.roleIds) {
      const key = `${m.userId}:${roleId}`
      desiredSet.add(key)
      desiredPairs.push({ FK_projectId: projectId, FK_userId: m.userId, FK_projectRoleId: roleId })
    }
  }

  const toRemove = currentMembers.filter(m => !desiredSet.has(`${m.FK_userId}:${m.FK_projectRoleId}`))
  const toAdd = desiredPairs.filter(p => !currentSet.has(`${p.FK_userId}:${p.FK_projectRoleId}`))

  for (const m of toRemove) {
    const { error } = await supabase
      .from('ProjectUsers')
      .delete()
      .eq('FK_projectId', projectId)
      .eq('FK_userId', m.FK_userId)
      .eq('FK_projectRoleId', m.FK_projectRoleId)
    if (error) throw new Error(error.message)
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from('ProjectUsers').insert(toAdd)
    if (error) throw new Error(error.message)
  }

  return true
}

async function checkProjectAdmin(projectId, userId) {
  // Check system-level admin OR project-level Scrum Master
  const { data: roleData, error: roleError } = await supabase
    .from('UserRoles')
    .select('Roles(name)')
    .eq('FK_userId', userId)

  if (roleError) throw new Error(roleError.message)

  const isAdmin = roleData?.some(r => r.Roles?.name === 'Admin')

  if (!isAdmin) {
    const { data: membership, error: memberError } = await supabase
      .from('ProjectUsers')
      .select('ProjectRoles(projectRole)')
      .eq('FK_projectId', projectId)
      .eq('FK_userId', userId)
      .maybeSingle()

    if (memberError) throw new Error(memberError.message)
    if (!membership) throw new Error('You are not a member of this project.')

    const role = membership.ProjectRoles?.projectRole
    if (role !== 'Scrum Master') throw new Error('Only Admins and Scrum Masters can manage project members.')
  }
}

export async function updateProjectName(projectId, name) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  await checkProjectAdmin(projectId, user.id)

  // Check duplicate name
  const { data: existing, error: dupError } = await supabase
    .from('Projects')
    .select('id')
    .ilike('name', name)
    .neq('id', projectId)
    .maybeSingle()

  if (dupError) throw new Error(dupError.message)
  if (existing) throw new Error(`A project named "${name}" already exists.`)

  const { data, error } = await supabase
    .from('Projects')
    .update({ name })
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function addProjectMember(projectId, userId, projectRoleId) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  await checkProjectAdmin(projectId, user.id)

  // Check not already a member with this role
  const { data: existing, error: existError } = await supabase
    .from('ProjectUsers')
    .select('FK_userId')
    .eq('FK_projectId', projectId)
    .eq('FK_userId', userId)
    .eq('FK_projectRoleId', projectRoleId)
    .maybeSingle()

  if (existError) throw new Error(existError.message)
  if (existing) throw new Error('User is already a member of this project with this role.')

  const { data, error } = await supabase
    .from('ProjectUsers')
    .insert({ FK_projectId: projectId, FK_userId: userId, FK_projectRoleId: projectRoleId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateProjectMemberRole(projectId, userId, newProjectRoleId) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  await checkProjectAdmin(projectId, user.id)

  // Check member exists
  const { data: existing, error: existError } = await supabase
    .from('ProjectUsers')
    .select('FK_userId')
    .eq('FK_projectId', projectId)
    .eq('FK_userId', userId)
    .maybeSingle()

  if (existError) throw new Error(existError.message)
  if (!existing) throw new Error('User is not a member of this project.')

  const { data, error } = await supabase
    .from('ProjectUsers')
    .update({ FK_projectRoleId: newProjectRoleId })
    .eq('FK_projectId', projectId)
    .eq('FK_userId', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function removeProjectMember(projectId, userId) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  await checkProjectAdmin(projectId, user.id)

  const { data: allMembers, error: membersError } = await supabase
    .from('ProjectUsers')
    .select('FK_userId, FK_projectRoleId, ProjectRoles(projectRole)')
    .eq('FK_projectId', projectId)

  if (membersError) throw new Error(membersError.message)

  const userRoles = allMembers
    .filter(m => m.FK_userId === userId)
    .map(m => m.ProjectRoles?.projectRole)

  for (const exclusiveRole of ['Product Owner', 'Scrum Master']) {
    if (userRoles.includes(exclusiveRole)) {
      const othersWithRole = allMembers.filter(
        m => m.FK_userId !== userId && m.ProjectRoles?.projectRole === exclusiveRole
      )
      if (othersWithRole.length === 0) {
        const label = exclusiveRole === 'Product Owner' ? 'Produktni vodja' : 'Skrbnik metodologije'
        throw new Error(`Ni mogoče odstraniti člana, ker je edini ${label} na projektu.`)
      }
    }
  }

  const { error } = await supabase
    .from('ProjectUsers')
    .delete()
    .eq('FK_projectId', projectId)
    .eq('FK_userId', userId)

  if (error) throw new Error(error.message)
  return true
}

export async function removeProjectMemberRole(projectId, userId, projectRoleId) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not authenticated.')

  await checkProjectAdmin(projectId, user.id)

  const { data: roleData, error: roleError } = await supabase
    .from('ProjectRoles')
    .select('projectRole')
    .eq('id', projectRoleId)
    .single()

  if (roleError) throw new Error(roleError.message)

  if (['Product Owner', 'Scrum Master'].includes(roleData?.projectRole)) {
    const { data: others, error: othersError } = await supabase
      .from('ProjectUsers')
      .select('FK_userId')
      .eq('FK_projectId', projectId)
      .eq('FK_projectRoleId', projectRoleId)
      .neq('FK_userId', userId)

    if (othersError) throw new Error(othersError.message)

    if (!others || others.length === 0) {
      const label = roleData.projectRole === 'Product Owner' ? 'Produktni vodja' : 'Skrbnik metodologije'
      throw new Error(`Ni mogoče odvzeti vloge "${label}", ker je ta član edini s to vlogo na projektu.`)
    }
  }

  const { error } = await supabase
    .from('ProjectUsers')
    .delete()
    .eq('FK_projectId', projectId)
    .eq('FK_userId', userId)
    .eq('FK_projectRoleId', projectRoleId)

  if (error) throw new Error(error.message)
  return true
}