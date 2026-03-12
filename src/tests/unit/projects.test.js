import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUsers, getProjectRoles, getProjects, createProject } from '../../services/projects'
import { supabase } from '../../config/supabase'

vi.mock('../../config/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}))

beforeEach(() => {
    vi.clearAllMocks()
})

// --- helpers to build mock chains ---

function mockChain(overrides) {
    const chain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        order:  vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        ...overrides,
    }
    return chain
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
            { id: 1, projectRole: 'ProductOwner' },
            { id: 2, projectRole: 'ScrumMaster' },
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

// ---

describe('createProject', () => {
    it('creates a project with no users', async () => {
        const mockProject = { id: 1, name: 'Solo Project', description: 'just me' }
        supabase.from.mockReturnValue(
            mockChain({ single: vi.fn().mockResolvedValue({ data: mockProject, error: null }) })
        )

        const result = await createProject('Solo Project', 'just me', [])

        expect(supabase.from).toHaveBeenCalledWith('Projects')
        expect(result).toEqual(mockProject)
        // ProjectUsers insert should NOT be called when users array is empty
        expect(supabase.from).toHaveBeenCalledTimes(1)
    })

    it('creates a project and inserts all users with their roles', async () => {
        const mockProject = { id: 42, name: 'Team Project', description: '' }

        const projectChain = mockChain({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
        })
        const usersChain = mockChain({
            insert: vi.fn().mockResolvedValue({ error: null }),
        })

        supabase.from
            .mockReturnValueOnce(projectChain)
            .mockReturnValueOnce(usersChain)

        const users = [
            { id: 'uuid-1', projectRoleId: 1 },
            { id: 'uuid-2', projectRoleId: 3 },
        ]

        const result = await createProject('Team Project', '', users)

        expect(result).toEqual(mockProject)
        expect(usersChain.insert).toHaveBeenCalledWith([
            { FK_projectId: 42, FK_userId: 'uuid-1', FK_projectRoleId: 1 },
            { FK_projectId: 42, FK_userId: 'uuid-2', FK_projectRoleId: 3 },
        ])
    })

    it('throws on duplicate project name', async () => {
        supabase.from.mockReturnValue(
            mockChain({
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'duplicate key value violates unique constraint "Projects_name_key"' },
                }),
            })
        )

        await expect(createProject('Existing Project', '', [])).rejects.toThrow(
            'duplicate key value violates unique constraint'
        )
    })

    it('throws if user insertion fails and does not silently swallow the error', async () => {
        const mockProject = { id: 5, name: 'Broken Project', description: '' }

        const projectChain = mockChain({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
        })
        const usersChain = mockChain({
            insert: vi.fn().mockResolvedValue({ error: { message: 'foreign key constraint violation' } }),
        })

        supabase.from
            .mockReturnValueOnce(projectChain)
            .mockReturnValueOnce(usersChain)

        await expect(
            createProject('Broken Project', '', [{ id: 'bad-uuid', projectRoleId: 99 }])
        ).rejects.toThrow('foreign key constraint violation')
    })

    it('uses the project id returned by supabase when building ProjectUsers rows', async () => {
        const mockProject = { id: 99, name: 'ID Check', description: '' }

        const projectChain = mockChain({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
        })
        const usersChain = mockChain({
            insert: vi.fn().mockResolvedValue({ error: null }),
        })

        supabase.from
            .mockReturnValueOnce(projectChain)
            .mockReturnValueOnce(usersChain)

        await createProject('ID Check', '', [{ id: 'uuid-x', projectRoleId: 2 }])

        expect(usersChain.insert).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ FK_projectId: 99 }),
            ])
        )
    })
})
