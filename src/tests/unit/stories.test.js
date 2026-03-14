import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPriorities, createUserStory } from '../../services/stories'
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

function mockChain(overrides) {
    const chain = {
        select:      vi.fn().mockReturnThis(),
        insert:      vi.fn().mockReturnThis(),
        delete:      vi.fn().mockReturnThis(),
        eq:          vi.fn().mockReturnThis(),
        single:      vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        ...overrides,
    }
    return chain
}

function mockProductOwner(userId = 'po-uuid') {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    return mockChain({
        maybeSingle: vi.fn().mockResolvedValue({
            data: { FK_projectRoleId: 1, ProjectRoles: { projectRole: 'Product Owner' } },
            error: null,
        }),
    })
}

// ---

describe('getPriorities', () => {
    it('returns list of priorities', async () => {
        const mockPriorities = [
            { id: 1, priority: 'Must have' },
            { id: 2, priority: 'Should have' },
            { id: 3, priority: 'Could have' },
            { id: 4, priority: "Won't have this time" },
        ]
        supabase.from.mockReturnValue(
            mockChain({ select: vi.fn().mockResolvedValue({ data: mockPriorities, error: null }) })
        )

        const result = await getPriorities()

        expect(supabase.from).toHaveBeenCalledWith('Priorities')
        expect(result).toEqual(mockPriorities)
    })

    it('throws if supabase returns an error', async () => {
        supabase.from.mockReturnValue(
            mockChain({ select: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) })
        )

        await expect(getPriorities()).rejects.toThrow('DB error')
    })
})

// ---

describe('createUserStory', () => {
    const validInput = {
        name: 'As a user I want to log in',
        description: 'Login functionality',
        acceptanceTests: ['User can enter credentials', 'User gets redirected on success'],
        priorityId: 1,
        businessValue: 10,
    }

    it('throws if not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(createUserStory(1, validInput)).rejects.toThrow('Not authenticated.')
    })

    it('throws if user is not a project member', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-uuid' } } } })
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        )

        await expect(createUserStory(1, validInput)).rejects.toThrow('You are not a member of this project.')
    })

    it('throws if membership query fails', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-uuid' } } } })
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'query failed' } }) })
        )

        await expect(createUserStory(1, validInput)).rejects.toThrow('query failed')
    })

    it('throws if user role is Developer', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'dev-uuid' } } } })
        supabase.from.mockReturnValueOnce(
            mockChain({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { FK_projectRoleId: 3, ProjectRoles: { projectRole: 'Developer' } },
                    error: null,
                }),
            })
        )

        await expect(createUserStory(1, validInput)).rejects.toThrow(
            'Only Product Owners and Scrum Masters can create user stories.'
        )
    })

    it('throws if business value is negative', async () => {
        const memberChain = mockProductOwner()
        supabase.from.mockReturnValueOnce(memberChain)

        await expect(createUserStory(1, { ...validInput, businessValue: -5 })).rejects.toThrow(
            'Business value must be a non-negative integer.'
        )
    })

    it('throws if business value is a float', async () => {
        const memberChain = mockProductOwner()
        supabase.from.mockReturnValueOnce(memberChain)

        await expect(createUserStory(1, { ...validInput, businessValue: 1.5 })).rejects.toThrow(
            'Business value must be a non-negative integer.'
        )
    })

    it('throws if priorityId is missing', async () => {
        const memberChain = mockProductOwner()
        supabase.from.mockReturnValueOnce(memberChain)

        await expect(createUserStory(1, { ...validInput, priorityId: null })).rejects.toThrow(
            'Priority is required.'
        )
    })

    it('throws if a story with the same name already exists in the project', async () => {
        const memberChain = mockProductOwner()
        const dupChain = mockChain({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 99 }, error: null }),
        })
        supabase.from.mockReturnValueOnce(memberChain).mockReturnValueOnce(dupChain)

        await expect(createUserStory(1, validInput)).rejects.toThrow(
            'A user story with this name already exists in this project.'
        )
    })

    it('throws if duplicate check query fails', async () => {
        const memberChain = mockProductOwner()
        const dupChain = mockChain({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'dup query error' } }),
        })
        supabase.from.mockReturnValueOnce(memberChain).mockReturnValueOnce(dupChain)

        await expect(createUserStory(1, validInput)).rejects.toThrow('dup query error')
    })

    it('inserts user story and returns it (no acceptance tests)', async () => {
        const mockStory = { id: 7, name: validInput.name, FK_projectId: 1 }
        const memberChain = mockProductOwner()
        const dupChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        const storyChain = mockChain({ single: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })

        supabase.from.mockReturnValueOnce(memberChain).mockReturnValueOnce(dupChain).mockReturnValueOnce(storyChain)

        const result = await createUserStory(1, { ...validInput, acceptanceTests: [] })

        expect(supabase.from).toHaveBeenCalledWith('UserStories')
        expect(result).toEqual(mockStory)
        expect(supabase.from).toHaveBeenCalledTimes(3)
    })

    it('inserts acceptance tests after creating the story', async () => {
        const mockStory = { id: 8, name: validInput.name, FK_projectId: 1 }
        const memberChain = mockProductOwner()
        const dupChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        const storyChain = mockChain({ single: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })
        const testsChain = mockChain({ insert: vi.fn().mockResolvedValue({ error: null }) })

        supabase.from
            .mockReturnValueOnce(memberChain)
            .mockReturnValueOnce(dupChain)
            .mockReturnValueOnce(storyChain)
            .mockReturnValueOnce(testsChain)

        await createUserStory(1, validInput)

        expect(supabase.from).toHaveBeenCalledWith('AcceptanceTests')
        expect(testsChain.insert).toHaveBeenCalledWith([
            { description: 'User can enter credentials', FK_userStoryId: 8 },
            { description: 'User gets redirected on success', FK_userStoryId: 8 },
        ])
    })

    it('throws if story insert fails', async () => {
        const memberChain = mockProductOwner()
        const dupChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        const storyChain = mockChain({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
        })

        supabase.from.mockReturnValueOnce(memberChain).mockReturnValueOnce(dupChain).mockReturnValueOnce(storyChain)

        await expect(createUserStory(1, validInput)).rejects.toThrow('insert failed')
    })

    it('throws if acceptance test insert fails', async () => {
        const mockStory = { id: 9, name: validInput.name, FK_projectId: 1 }
        const memberChain = mockProductOwner()
        const dupChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        const storyChain = mockChain({ single: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })
        const testsChain = mockChain({
            insert: vi.fn().mockResolvedValue({ error: { message: 'acceptance test insert failed' } }),
        })

        const compensateChain = mockChain({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })

        supabase.from
            .mockReturnValueOnce(memberChain)
            .mockReturnValueOnce(dupChain)
            .mockReturnValueOnce(storyChain)
            .mockReturnValueOnce(testsChain)
            .mockReturnValueOnce(compensateChain)

        await expect(createUserStory(1, validInput)).rejects.toThrow('acceptance test insert failed')
    })

    it('works when the user is a Scrum Master', async () => {
        const mockStory = { id: 10, name: validInput.name, FK_projectId: 1 }
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

        const memberChain = mockChain({
            maybeSingle: vi.fn().mockResolvedValue({
                data: { FK_projectRoleId: 2, ProjectRoles: { projectRole: 'Scrum Master' } },
                error: null,
            }),
        })
        const dupChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        const storyChain = mockChain({ single: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })

        supabase.from.mockReturnValueOnce(memberChain).mockReturnValueOnce(dupChain).mockReturnValueOnce(storyChain)

        const result = await createUserStory(1, { ...validInput, acceptanceTests: [] })

        expect(result).toEqual(mockStory)
    })
})
