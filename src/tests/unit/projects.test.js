import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUsers, getProjectRoles, getProjectUsers, getProjects, createProject } from '../../services/projects'
import { supabase } from '../../config/supabase'

vi.mock('../../config/supabase', () => ({
    supabase: {
        from: vi.fn(),
        auth: { getSession: vi.fn() },
    },
}))

beforeEach(() => {
    vi.clearAllMocks()
})

// --- helpers to build mock chains ---

function mockChain(overrides) {
    const chain = {
        select:      vi.fn().mockReturnThis(),
        insert:      vi.fn().mockReturnThis(),
        update:      vi.fn().mockReturnThis(),
        order:       vi.fn().mockReturnThis(),
        eq:          vi.fn().mockReturnThis(),
        is:          vi.fn().mockReturnThis(),
        ilike:       vi.fn().mockReturnThis(),
        single:      vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        ...overrides,
    }
    return chain
}

function mockNoDuplicate() {
    return mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
}

// ---

describe('getUsers', () => {
    it('returns list of users', async () => {
        const mockUsers = [
            { id: 'uuid-1', username: 'alice', name: 'Alice', surname: 'Smith' },
            { id: 'uuid-2', username: 'bob',   name: 'Bob',   surname: 'Jones' },
        ]
        supabase.from.mockReturnValue(
            mockChain({ order: vi.fn().mockResolvedValue({ data: mockUsers, error: null }) })
        )

        const result = await getUsers()

        expect(supabase.from).toHaveBeenCalledWith('Users')
        expect(result).toEqual(mockUsers)
    })

    it('throws if supabase returns an error', async () => {
        supabase.from.mockReturnValue(
            mockChain({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) })
        )

        await expect(getUsers()).rejects.toThrow('DB error')
    })
})

// ---

describe('getProjectRoles', () => {
    it('returns list of project roles', async () => {
        const mockRoles = [
            { id: 1, projectRole: 'Product Owner' },
            { id: 2, projectRole: 'Scrum Master' },
            { id: 3, projectRole: 'Developer' },
        ]
        supabase.from.mockReturnValue(
            mockChain({ select: vi.fn().mockResolvedValue({ data: mockRoles, error: null }) })
        )

        const result = await getProjectRoles()

        expect(supabase.from).toHaveBeenCalledWith('ProjectRoles')
        expect(result).toEqual(mockRoles)
    })

    it('throws if supabase returns an error', async () => {
        supabase.from.mockReturnValue(
            mockChain({ select: vi.fn().mockResolvedValue({ data: null, error: { message: 'connection failed' } }) })
        )

        await expect(getProjectRoles()).rejects.toThrow('connection failed')
    })
})

// ---

describe('getProjectUsers', () => {
    it('returns members of a project with user and role details', async () => {
        const mockMembers = [
            {
                FK_userId: 'uuid-1',
                FK_projectRoleId: 1,
                Users: { username: 'alice', name: 'Alice', surname: 'Smith' },
                ProjectRoles: { projectRole: 'Scrum Master' },
            },
            {
                FK_userId: 'uuid-2',
                FK_projectRoleId: 3,
                Users: { username: 'bob', name: 'Bob', surname: 'Jones' },
                ProjectRoles: { projectRole: 'Developer' },
            },
        ]
        supabase.from.mockReturnValue(
            mockChain({ eq: vi.fn().mockResolvedValue({ data: mockMembers, error: null }) })
        )

        const result = await getProjectUsers(42)

        expect(supabase.from).toHaveBeenCalledWith('ProjectUsers')
        expect(result).toEqual(mockMembers)
    })

    it('returns an empty array when the project has no members', async () => {
        supabase.from.mockReturnValue(
            mockChain({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
        )

        const result = await getProjectUsers(99)

        expect(result).toEqual([])
    })

    it('throws if supabase returns an error', async () => {
        supabase.from.mockReturnValue(
            mockChain({ eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'query failed' } }) })
        )

        await expect(getProjectUsers(1)).rejects.toThrow('query failed')
    })
})

// ---

describe('getProjects', () => {
    it('returns projects with their members and roles', async () => {
        const mockProjects = [
            {
                id: 1,
                name: 'Project A',
                ProjectUsers: [
                    {
                        FK_userId: 'uuid-1',
                        FK_projectRoleId: 1,
                        Users: { username: 'alice', name: 'Alice', surname: 'Smith' },
                        ProjectRoles: { projectRole: 'ProductOwner' },
                    },
                ],
            },
        ]
        supabase.from.mockReturnValue(
            mockChain({ order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }) })
        )

        const result = await getProjects()

        expect(supabase.from).toHaveBeenCalledWith('Projects')
        expect(result).toEqual(mockProjects)
    })

    it('throws if supabase returns an error', async () => {
        supabase.from.mockReturnValue(
            mockChain({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'query failed' } }) })
        )

        await expect(getProjects()).rejects.toThrow('query failed')
    })
})

// --- helpers for createProject admin check ---

function mockAdminUser(userId = 'admin-uuid') {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    return mockChain({ eq: vi.fn().mockResolvedValue({ data: [{ Roles: { name: 'Admin' } }], error: null }) })
}

// ---

describe('createProject', () => {
    it('throws if the user is not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(createProject('Any Project', '', [])).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws if the user is not an admin', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-uuid' } } } })
        supabase.from.mockReturnValueOnce(
            mockChain({ eq: vi.fn().mockResolvedValue({ data: [{ Roles: { name: 'User' } }], error: null }) })
        )

        await expect(createProject('Any Project', '', [])).rejects.toThrow('Samo administratorji lahko ustvarjajo projekte.')
    })

    it('throws if the role query fails', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'admin-uuid' } } } })
        supabase.from.mockReturnValueOnce(
            mockChain({ eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'connection error' } }) })
        )

        await expect(createProject('Any Project', '', [])).rejects.toThrow('connection error')
    })

    it('creates a project with no users', async () => {
        const mockProject = { id: 1, name: 'Solo Project', description: 'just me' }
        const adminChain = mockAdminUser()
        const projectChain = mockChain({ single: vi.fn().mockResolvedValue({ data: mockProject, error: null }) })

        supabase.from
            .mockReturnValueOnce(adminChain)
            .mockReturnValueOnce(mockNoDuplicate())
            .mockReturnValueOnce(projectChain)

        const result = await createProject('Solo Project', 'just me', [])

        expect(supabase.from).toHaveBeenCalledWith('UserRoles')
        expect(supabase.from).toHaveBeenCalledWith('Projects')
        expect(result).toEqual(mockProject)
        // ProjectUsers insert should NOT be called when users array is empty
        expect(supabase.from).toHaveBeenCalledTimes(3)
    })

    it('creates a project and inserts all users with their roles', async () => {
        const mockProject = { id: 42, name: 'Team Project', description: '' }

        const adminChain = mockAdminUser()
        const projectChain = mockChain({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
        })
        const usersChain = mockChain({
            insert: vi.fn().mockResolvedValue({ error: null }),
        })

        supabase.from
            .mockReturnValueOnce(adminChain)
            .mockReturnValueOnce(mockNoDuplicate())
            .mockReturnValueOnce(projectChain)
            .mockReturnValueOnce(usersChain)

        const users = [
            { id: 'uuid-1', projectRoleIds: [1] },
            { id: 'uuid-2', projectRoleIds: [3] },
        ]

        const result = await createProject('Team Project', '', users)

        expect(result).toEqual(mockProject)
        expect(usersChain.insert).toHaveBeenCalledWith([
            { FK_projectId: 42, FK_userId: 'uuid-1', FK_projectRoleId: 1 },
            { FK_projectId: 42, FK_userId: 'uuid-2', FK_projectRoleId: 3 },
        ])
    })

    it('throws on duplicate project name', async () => {
        const adminChain = mockAdminUser()
        const dupChain = mockChain({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
        })
        supabase.from
            .mockReturnValueOnce(adminChain)
            .mockReturnValueOnce(dupChain)

        await expect(createProject('Existing Project', '', [])).rejects.toThrow(
            'Projekt z imenom "Existing Project" že obstaja.'
        )
    })

    it('throws if user insertion fails and does not silently swallow the error', async () => {
        const mockProject = { id: 5, name: 'Broken Project', description: '' }

        const adminChain = mockAdminUser()
        const projectChain = mockChain({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
        })
        const usersChain = mockChain({
            insert: vi.fn().mockResolvedValue({ error: { message: 'foreign key constraint violation' } }),
        })

        supabase.from
            .mockReturnValueOnce(adminChain)
            .mockReturnValueOnce(mockNoDuplicate())
            .mockReturnValueOnce(projectChain)
            .mockReturnValueOnce(usersChain)

        await expect(
            createProject('Broken Project', '', [{ id: 'bad-uuid', projectRoleIds: [99] }])
        ).rejects.toThrow('foreign key constraint violation')
    })

    it('uses the project id returned by supabase when building ProjectUsers rows', async () => {
        const mockProject = { id: 99, name: 'ID Check', description: '' }

        const adminChain = mockAdminUser()
        const projectChain = mockChain({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
        })
        const usersChain = mockChain({
            insert: vi.fn().mockResolvedValue({ error: null }),
        })

        supabase.from
            .mockReturnValueOnce(adminChain)
            .mockReturnValueOnce(mockNoDuplicate())
            .mockReturnValueOnce(projectChain)
            .mockReturnValueOnce(usersChain)

        await createProject('ID Check', '', [{ id: 'uuid-x', projectRoleIds: [2] }])

        expect(usersChain.insert).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ FK_projectId: 99 }),
            ])
        )
    })
})
