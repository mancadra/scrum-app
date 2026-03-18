import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from '../../services/auth'
import { getUsers, getProjectRoles, getProjectUsers, getProjects, createProject, getUsersProjects } from '../../services/projects'
import { supabase } from '../../config/supabase'

const TEST_USERNAME = 'testuser01'
const TEST_PASSWORD = 'testpassword123!'

// track created project ids so we can clean up after tests
const createdProjectIds = []

const uniqueName = (base) => `${base} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

beforeAll(async () => {
    await signIn(TEST_USERNAME, TEST_PASSWORD)
})

afterAll(async () => {
    if (createdProjectIds.length > 0) {
        await supabase.from('ProjectUsers').delete().in('FK_projectId', createdProjectIds)
        await supabase.from('Projects').delete().in('id', createdProjectIds)
    }
})

describe('getUsers', () => {
    it('returns an array of users with expected fields', async () => {
        const users = await getUsers()

        expect(Array.isArray(users)).toBe(true)
        expect(users.length).toBeGreaterThan(0)
        expect(users[0]).toMatchObject({
            id: expect.any(String),
            username: expect.any(String),
        })
    })
})

describe('getProjectRoles', () => {
    it('returns the three scrum roles', async () => {
        const roles = await getProjectRoles()

        expect(Array.isArray(roles)).toBe(true)
        expect(roles.length).toBeGreaterThan(0)

        const roleNames = roles.map((r) => r.projectRole)
        expect(roleNames).toEqual(expect.arrayContaining(['Product Owner', 'Scrum Master', 'Developer']))
    })
})

describe('getProjects', () => {
    it('returns an array with project and member data', async () => {
        const projects = await getProjects()

        expect(Array.isArray(projects)).toBe(true)
        if (projects.length > 0) {
            expect(projects[0]).toHaveProperty('id')
            expect(projects[0]).toHaveProperty('name')
            expect(projects[0]).toHaveProperty('ProjectUsers')
        }
    })
})

describe('getProjectUsers', () => {
    it('returns an empty array for a project with no members', async () => {
        const project = await createProject(uniqueName('Integration GetProjectUsers Empty Test'), '', [])
        createdProjectIds.push(project.id)

        const members = await getProjectUsers(project.id)

        expect(Array.isArray(members)).toBe(true)
        expect(members).toHaveLength(0)
    })

    it('returns members with user and role details', async () => {
        const users = await getUsers()
        const roles = await getProjectRoles()

        const projectUsers = [{ id: users[0].id, projectRoleId: roles[0].id }]
        const project = await createProject('Integration GetProjectUsers Members Test', '', projectUsers)
        createdProjectIds.push(project.id)

        const members = await getProjectUsers(project.id)

        expect(members).toHaveLength(1)
        expect(members[0].FK_userId).toBe(users[0].id)
        expect(members[0].FK_projectRoleId).toBe(roles[0].id)
        expect(members[0].Users).toMatchObject({ username: expect.any(String) })
        expect(members[0].ProjectRoles).toMatchObject({ projectRole: expect.any(String) })
    })
})

describe('getUsersProjects', () => {
    it('returns only projects the current user is a member of', async () => {
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id

        const roles = await getProjectRoles()
        const project = await createProject(uniqueName('getUsersProjects Test'), '', [{ id: userId, projectRoleId: roles[0].id }])
        createdProjectIds.push(project.id)

        const projects = await getUsersProjects(userId)

        expect(Array.isArray(projects)).toBe(true)
        const found = projects.find(p => p.id === project.id)
        expect(found).toBeDefined()
        expect(found).toHaveProperty('name')
    })

    it('does not return projects the user is not a member of', async () => {
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id

        const project = await createProject(uniqueName('getUsersProjects Excluded Test'), '', [])
        createdProjectIds.push(project.id)

        const projects = await getUsersProjects(userId)
        const found = projects.find(p => p.id === project.id)
        expect(found).toBeUndefined()
    })
})

describe('createProject', () => {
    it('creates a project with no members', async () => {
        const name = uniqueName('Integration Test Project')
        const project = await createProject(name, 'created by test', [])
        createdProjectIds.push(project.id)

        expect(project).toBeDefined()
        expect(project.id).toBeDefined()
        expect(project.name).toBe(name)
    })

    it('creates a project and assigns users with roles', async () => {
        const users = await getUsers()
        const roles = await getProjectRoles()

        const projectUsers = [{ id: users[0].id, projectRoleId: roles[0].id }]

        const project = await createProject(uniqueName('Integration Test Project With Members'), '', projectUsers)
        createdProjectIds.push(project.id)

        // verify the assignment was written to the DB
        const { data } = await supabase
            .from('ProjectUsers')
            .select('FK_userId, FK_projectRoleId')
            .eq('FK_projectId', project.id)

        expect(data).toHaveLength(1)
        expect(data[0].FK_userId).toBe(users[0].id)
        expect(data[0].FK_projectRoleId).toBe(roles[0].id)
    })

    it('throws on duplicate project name', async () => {
        const name = uniqueName('Integration Duplicate Test')
        const project = await createProject(name, '', [])
        createdProjectIds.push(project.id)

        await expect(createProject(name, '', [])).rejects.toThrow()
    })

    it('created project appears in getProjects', async () => {
        const name = uniqueName('Integration Visibility Test')
        const project = await createProject(name, 'should be listed', [])
        createdProjectIds.push(project.id)

        const projects = await getProjects()
        const found = projects.find((p) => p.id === project.id)

        expect(found).toBeDefined()
        expect(found.name).toBe(name)
        expect(found.description).toBe('should be listed')
    })
})
