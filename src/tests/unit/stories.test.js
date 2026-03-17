import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPriorities, createUserStory, addStoriesToSprint, setTimeComplexity } from '../../services/stories'
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
        in:          vi.fn().mockReturnThis(),
        or:          vi.fn().mockReturnThis(),
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

function mockScrumMaster(userId = 'sm-uuid') {
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
  return mockChain({
    maybeSingle: vi.fn().mockResolvedValue({
      data: { FK_projectRoleId: 2, ProjectRoles: { projectRole: 'Scrum Master' } },
      error: null,
    }),
  })
}

const sprintId = 'sprint-uuid-123'
const storyIds = [1, 2, 3]

const mockSprint = { id: sprintId, FK_projectId: 'project-uuid-123' }

const validStories = [
  { id: 1, realized: false, timeComplexity: 5 },
  { id: 2, realized: false, timeComplexity: 3 },
  { id: 3, realized: false, timeComplexity: 8 },
]

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
describe('setTimeComplexity', () => {
    const storyId = 42
    const mockStory = { id: storyId, FK_projectId: 1 }
    const mockUpdated = { id: storyId, FK_projectId: 1, timeComplexity: 5 }

    it('throws if not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('Not authenticated.')
    })

    it('throws if time complexity is zero', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

        await expect(setTimeComplexity(storyId, 0)).rejects.toThrow('Time complexity must be a positive number.')
    })

    it('throws if time complexity is negative', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

        await expect(setTimeComplexity(storyId, -3)).rejects.toThrow('Time complexity must be a positive number.')
    })

    it('throws if time complexity is NaN', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

        await expect(setTimeComplexity(storyId, NaN)).rejects.toThrow('Time complexity must be a positive number.')
    })

    it('throws if story is not found', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })
        const storyChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        supabase.from.mockReturnValueOnce(storyChain)

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('User story not found.')
    })

    it('throws if story query fails', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })
        const storyChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'story query failed' } }) })
        supabase.from.mockReturnValueOnce(storyChain)

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('story query failed')
    })

    it('throws if user is not a member of the project', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })
        const storyChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })
        const memberChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        supabase.from.mockReturnValueOnce(storyChain).mockReturnValueOnce(memberChain)

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('You are not a member of this project.')
    })

    it('throws if user is not a Scrum Master', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'po-uuid' } } } })
        const storyChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })
        const memberChain = mockChain({
            maybeSingle: vi.fn().mockResolvedValue({
                data: { FK_projectRoleId: 1, ProjectRoles: { projectRole: 'Product Owner' } },
                error: null,
            }),
        })
        supabase.from.mockReturnValueOnce(storyChain).mockReturnValueOnce(memberChain)

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('Only Scrum Masters can set time complexity.')
    })

    it('throws if story is already assigned to a sprint', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })
        const storyChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })
        const memberChain = mockScrumMaster()
        const sprintLinkChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { FK_sprintId: 99 }, error: null }) })
        supabase.from.mockReturnValueOnce(storyChain).mockReturnValueOnce(memberChain).mockReturnValueOnce(sprintLinkChain)

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('Cannot set time complexity on a story that is already assigned to a sprint.')
    })

    it('updates and returns the story on success', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })
        const storyChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })
        const memberChain = mockScrumMaster()
        const sprintLinkChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        const updateChain = mockChain({
            update: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
        })

        supabase.from
            .mockReturnValueOnce(storyChain)
            .mockReturnValueOnce(memberChain)
            .mockReturnValueOnce(sprintLinkChain)
            .mockReturnValueOnce(updateChain)

        const result = await setTimeComplexity(storyId, 5)
        expect(result).toEqual(mockUpdated)
        expect(result.timeComplexity).toBe(5)
    })

    it('throws if update query fails', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })
        const storyChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })
        const memberChain = mockScrumMaster()
        const sprintLinkChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        const updateChain = mockChain({
            update: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }),
        })

        supabase.from
            .mockReturnValueOnce(storyChain)
            .mockReturnValueOnce(memberChain)
            .mockReturnValueOnce(sprintLinkChain)
            .mockReturnValueOnce(updateChain)

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('update failed')
    })
})

describe('addStoriesToSprint', () => {

  it('successfully adds stories to a sprint', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockSprint, error: null }) })
    const memberChain = mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { FK_projectRoleId: 2, ProjectRoles: { projectRole: 'Scrum Master' } },
        error: null,
      }),
    })
    const storiesChain = mockChain({ in: vi.fn().mockResolvedValue({ data: validStories, error: null }) })
    const activeLinksChain = mockChain({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })
    const insertChain = mockChain({
      select: vi.fn().mockResolvedValue({
        data: storyIds.map(id => ({ FK_sprintId: sprintId, FK_userStoryId: id })),
        error: null,
      }),
    })

    supabase.from
      .mockReturnValueOnce(sprintChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(storiesChain)
      .mockReturnValueOnce(activeLinksChain)
      .mockReturnValueOnce(insertChain)

    const result = await addStoriesToSprint(sprintId, storyIds)
    expect(result).toHaveLength(3)
  })

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    await expect(addStoriesToSprint(sprintId, storyIds)).rejects.toThrow('Not authenticated.')
  })

  it('throws if sprint is not found', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })
    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })

    supabase.from.mockReturnValueOnce(sprintChain)

    await expect(addStoriesToSprint(sprintId, storyIds)).rejects.toThrow('Sprint not found.')
  })

  it('throws if user is not a Scrum Master', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'dev-uuid' } } } })

    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockSprint, error: null }) })
    const memberChain = mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { FK_projectRoleId: 3, ProjectRoles: { projectRole: 'Developer' } },
        error: null,
      }),
    })

    supabase.from
      .mockReturnValueOnce(sprintChain)
      .mockReturnValueOnce(memberChain)

    await expect(addStoriesToSprint(sprintId, storyIds)).rejects.toThrow('Only Scrum Masters can add stories to a sprint.')
  })

  it('throws if any story is already realized', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockSprint, error: null }) })
    const memberChain = mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { FK_projectRoleId: 2, ProjectRoles: { projectRole: 'Scrum Master' } },
        error: null,
      }),
    })
    const storiesChain = mockChain({
      in: vi.fn().mockResolvedValue({
        data: [
          { id: 1, realized: false, timeComplexity: 5 },
          { id: 2, realized: true, timeComplexity: 3 },
        ],
        error: null,
      }),
    })

    supabase.from
      .mockReturnValueOnce(sprintChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(storiesChain)

    await expect(addStoriesToSprint(sprintId, [1, 2])).rejects.toThrow('Cannot add realized stories to a sprint')
  })

  it('throws if any story has no time complexity estimate', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockSprint, error: null }) })
    const memberChain = mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { FK_projectRoleId: 2, ProjectRoles: { projectRole: 'Scrum Master' } },
        error: null,
      }),
    })
    const storiesChain = mockChain({
      in: vi.fn().mockResolvedValue({
        data: [
          { id: 1, realized: false, timeComplexity: 5 },
          { id: 2, realized: false, timeComplexity: null },
        ],
        error: null,
      }),
    })

    supabase.from
      .mockReturnValueOnce(sprintChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(storiesChain)

    await expect(addStoriesToSprint(sprintId, [1, 2])).rejects.toThrow('Cannot add stories without time complexity estimate')
  })

  it('throws if any story is already assigned to an active sprint', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockSprint, error: null }) })
    const memberChain = mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { FK_projectRoleId: 2, ProjectRoles: { projectRole: 'Scrum Master' } },
        error: null,
      }),
    })
    const storiesChain = mockChain({ in: vi.fn().mockResolvedValue({ data: validStories, error: null }) })
    const activeLinksChain = mockChain({
      in: vi.fn().mockResolvedValue({
        data: [{
          FK_userStoryId: 1,
          Sprints: {
            startingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            endingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }],
        error: null,
      }),
    })

    supabase.from
      .mockReturnValueOnce(sprintChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(storiesChain)
      .mockReturnValueOnce(activeLinksChain)

    await expect(addStoriesToSprint(sprintId, storyIds)).rejects.toThrow('Some stories are already assigned to an active sprint')
  })
})
