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
    vi.resetAllMocks()
})

function mockChain(overrides) {
    const chain = {
        select:      vi.fn().mockReturnThis(),
        insert:      vi.fn().mockReturnThis(),
        delete:      vi.fn().mockReturnThis(),
        eq:          vi.fn().mockReturnThis(),
        lte:         vi.fn().mockReturnThis(),
        update:      vi.fn().mockReturnThis(),
        in:          vi.fn().mockReturnThis(),
        or:          vi.fn().mockReturnThis(),
        ilike:       vi.fn().mockReturnThis(),
        single:      vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        ...overrides,
    }
    return chain
}

function mockProductOwner(userId = 'po-uuid') {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
    chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Product Owner' } }], error: null })
    return chain
}

function mockScrumMaster(userId = 'sm-uuid') {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
    chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Scrum Master' } }], error: null })
    return chain
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

        await expect(createUserStory(1, validInput)).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws if user is not a project member', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-uuid' } } } })
        const notMemberChain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
        notMemberChain.eq.mockReturnValueOnce(notMemberChain).mockResolvedValueOnce({ data: [], error: null })
        supabase.from.mockReturnValueOnce(notMemberChain)

        await expect(createUserStory(1, validInput)).rejects.toThrow('Niste član tega projekta.')
    })

    it('throws if membership query fails', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-uuid' } } } })
        const failChain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
        failChain.eq.mockReturnValueOnce(failChain).mockResolvedValueOnce({ data: null, error: { message: 'query failed' } })
        supabase.from.mockReturnValueOnce(failChain)

        await expect(createUserStory(1, validInput)).rejects.toThrow('query failed')
    })

    it('throws if user role is Developer', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'dev-uuid' } } } })
        const devChain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
        devChain.eq
            .mockReturnValueOnce(devChain)
            .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Developer' } }], error: null })
        supabase.from.mockReturnValueOnce(devChain)

        await expect(createUserStory(1, validInput)).rejects.toThrow(
            'Samo produktni vodje in skrbniki metodologije lahko ustvarjajo uporabniške zgodbe.'
        )
    })

    it('throws if business value is negative', async () => {
        const memberChain = mockProductOwner()
        supabase.from.mockReturnValueOnce(memberChain)

        await expect(createUserStory(1, { ...validInput, businessValue: -5 })).rejects.toThrow(
            'Poslovna vrednost mora biti celo število med 1 in 10.'
        )
    })

    it('throws if business value is a float', async () => {
        const memberChain = mockProductOwner()
        supabase.from.mockReturnValueOnce(memberChain)

        await expect(createUserStory(1, { ...validInput, businessValue: 1.5 })).rejects.toThrow(
            'Poslovna vrednost mora biti celo število med 1 in 10.'
        )
    })

    it('throws if priorityId is missing', async () => {
        const memberChain = mockProductOwner()
        supabase.from.mockReturnValueOnce(memberChain)

        await expect(createUserStory(1, { ...validInput, priorityId: null })).rejects.toThrow(
            'Prioriteta je obvezna.'
        )
    })

    it('throws if a story with the same name already exists in the project', async () => {
        const memberChain = mockProductOwner()
        const dupChain = mockChain({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 99 }, error: null }),
        })
        supabase.from.mockReturnValueOnce(memberChain).mockReturnValueOnce(dupChain)

        await expect(createUserStory(1, validInput)).rejects.toThrow(
            'Uporabniška zgodba s tem imenom že obstaja v tem projektu.'
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

        const memberChain = (() => {
            const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
            chain.eq
                .mockReturnValueOnce(chain)
                .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Scrum Master' } }], error: null })
            return chain
        })()
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

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws if time complexity is zero', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

        await expect(setTimeComplexity(storyId, 0)).rejects.toThrow('Časovna zahtevnost mora biti pozitivno število.')
    })

    it('throws if time complexity is negative', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

        await expect(setTimeComplexity(storyId, -3)).rejects.toThrow('Časovna zahtevnost mora biti pozitivno število.')
    })

    it('throws if time complexity is NaN', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

        await expect(setTimeComplexity(storyId, NaN)).rejects.toThrow('Časovna zahtevnost mora biti pozitivno število.')
    })

    it('throws if story is not found', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })
        const storyChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        supabase.from.mockReturnValueOnce(storyChain)

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('Uporabniška zgodba ni bila najdena.')
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
        const notMemberChain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
        notMemberChain.eq.mockReturnValueOnce(notMemberChain).mockResolvedValueOnce({ data: [], error: null })
        supabase.from.mockReturnValueOnce(storyChain).mockReturnValueOnce(notMemberChain)

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('Niste član tega projekta.')
    })

    it('throws if user is not a Scrum Master', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'po-uuid' } } } })
        const storyChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })
        const poChain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
        poChain.eq
            .mockReturnValueOnce(poChain)
            .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Product Owner' } }], error: null })
        supabase.from.mockReturnValueOnce(storyChain).mockReturnValueOnce(poChain)

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('Samo skrbniki metodologije lahko nastavljajo časovno zahtevnost.')
    })

    it('throws if story is already assigned to a sprint', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })
        const storyChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) })
        const memberChain = mockScrumMaster()
        const sprintLinkChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { FK_sprintId: 99 }, error: null }) })
        supabase.from.mockReturnValueOnce(storyChain).mockReturnValueOnce(memberChain).mockReturnValueOnce(sprintLinkChain)

        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('Ni mogoče nastaviti časovne zahtevnosti za zgodbo, ki je že dodeljena sprintu.')
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
    const memberChain = (() => {
      const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
      chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Scrum Master' } }], error: null })
      return chain
    })()
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

    await expect(addStoriesToSprint(sprintId, storyIds)).rejects.toThrow('Niste prijavljeni.')
  })

  it('throws if sprint is not found', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })
    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })

    supabase.from.mockReturnValueOnce(sprintChain)

    await expect(addStoriesToSprint(sprintId, storyIds)).rejects.toThrow('Sprint ni bil najden.')
  })

  it('throws if user is not a Scrum Master', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'dev-uuid' } } } })

    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockSprint, error: null }) })
    const devChain = (() => {
      const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
      chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Developer' } }], error: null })
      return chain
    })()

    supabase.from
      .mockReturnValueOnce(sprintChain)
      .mockReturnValueOnce(devChain)

    await expect(addStoriesToSprint(sprintId, storyIds)).rejects.toThrow('Samo skrbniki metodologije lahko dodajajo zgodbe v sprint.')
  })

  it('throws if any story is already realized', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockSprint, error: null }) })
    const memberChain = (() => {
      const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
      chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Scrum Master' } }], error: null })
      return chain
    })()
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

    await expect(addStoriesToSprint(sprintId, [1, 2])).rejects.toThrow('Ni mogoče dodati realiziranih zgodb v sprint')
  })

  it('throws if any story has no time complexity estimate', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockSprint, error: null }) })
    const memberChain = (() => {
      const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
      chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Scrum Master' } }], error: null })
      return chain
    })()
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

    await expect(addStoriesToSprint(sprintId, [1, 2])).rejects.toThrow('Ni mogoče dodati zgodb brez ocene časovne zahtevnosti')
  })

  it('throws if any story is already assigned to an active sprint', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'sm-uuid' } } } })

    const sprintChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockSprint, error: null }) })
    const memberChain = (() => {
      const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
      chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Scrum Master' } }], error: null })
      return chain
    })()
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

    await expect(addStoriesToSprint(sprintId, storyIds)).rejects.toThrow('Nekatere zgodbe so že dodeljene aktivnemu sprintu')
  })
})
import { markStoryRealized } from '../../services/stories'

describe('markStoryRealized()', () => {

  const storyId = 1
  const userId = 'user-uuid'
  const projectId = 'project-uuid'

  function mockProductOwner() {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ProjectRoles: { projectRole: 'Product Owner' } },
        error: null,
      }),
    })
  }

  function mockStory(realized) {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: storyId, realized, FK_projectId: projectId },
        error: null,
      }),
    })
  }

  beforeEach(() => vi.clearAllMocks())

  it('successfully marks a story as realized', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    const sprintChain = mockChain({ gte: vi.fn().mockResolvedValue({ data: [{ id: 'sprint-uuid' }], error: null }) })
    const linkChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { FK_userStoryId: storyId }, error: null }) })
    const updateChain = mockChain({ single: vi.fn().mockResolvedValue({ data: { id: storyId, realized: true }, error: null }) })

    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(sprintChain)
      .mockReturnValueOnce(linkChain)
      .mockReturnValueOnce(updateChain)

    const result = await markStoryRealized(storyId)
    expect(result).toMatchObject({ realized: true })
  })

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    await expect(markStoryRealized(storyId)).rejects.toThrow('Not authenticated.')
  })

  it('throws if story is already realized', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(true))
      .mockReturnValueOnce(mockProductOwner())

    await expect(markStoryRealized(storyId)).rejects.toThrow('Story is already marked as realized.')
  })

  it('throws if story has been rejected', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(false))
      .mockReturnValueOnce(mockProductOwner())

    await expect(markStoryRealized(storyId)).rejects.toThrow('Story has already been rejected.')
  })

  it('throws if story is not in active sprint', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    const sprintChain = mockChain({ gte: vi.fn().mockResolvedValue({ data: [], error: null }) })

    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(sprintChain)

    await expect(markStoryRealized(storyId)).rejects.toThrow('No active sprint found.')
  })

  it('throws if user is not a Product Owner', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockChain({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ProjectRoles: { projectRole: 'Developer' } },
          error: null,
        }),
      }))

    await expect(markStoryRealized(storyId)).rejects.toThrow('Only Product Owners can mark stories as realized.')
  })

})

import { markStoryRejected } from '../../services/stories'

describe('markStoryRejected()', () => {

  const storyId = 1
  const userId = 'user-uuid'
  const projectId = 'project-uuid'

  function mockProductOwner() {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ProjectRoles: { projectRole: 'Product Owner' } },
        error: null,
      }),
    })
  }

  function mockStory(realized) {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: storyId, realized, FK_projectId: projectId },
        error: null,
      }),
    })
  }

  beforeEach(() => vi.clearAllMocks())

  it('successfully rejects a story', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    const sprintChain = mockChain({ gte: vi.fn().mockResolvedValue({ data: [{ id: 'sprint-uuid' }], error: null }) })
    const linkChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { FK_userStoryId: storyId }, error: null }) })
    const updateChain = mockChain({ single: vi.fn().mockResolvedValue({ data: { id: storyId, realized: false }, error: null }) })

    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(sprintChain)
      .mockReturnValueOnce(linkChain)
      .mockReturnValueOnce(updateChain)

    const result = await markStoryRejected(storyId)
    expect(result).toMatchObject({ realized: false })
  })

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    await expect(markStoryRejected(storyId)).rejects.toThrow('Not authenticated.')
  })

  it('throws if story is already rejected', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(false))
      .mockReturnValueOnce(mockProductOwner())

    await expect(markStoryRejected(storyId)).rejects.toThrow('Story has already been rejected.')
  })

  it('throws if story is already realized', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(true))
      .mockReturnValueOnce(mockProductOwner())

    await expect(markStoryRejected(storyId)).rejects.toThrow('Story is already marked as realized.')
  })

  it('throws if story is not in active sprint', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    const sprintChain = mockChain({ gte: vi.fn().mockResolvedValue({ data: [], error: null }) })

    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(sprintChain)

    await expect(markStoryRejected(storyId)).rejects.toThrow('No active sprint found.')
  })

  it('throws if user is not a Product Owner', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockChain({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ProjectRoles: { projectRole: 'Developer' } },
          error: null,
        }),
      }))

    await expect(markStoryRejected(storyId)).rejects.toThrow('Only Product Owners can reject stories.')
  })

})

import { editUserStory, deleteUserStory } from '../../services/stories'

describe('editUserStory()', () => {

  const storyId = 1
  const userId = 'user-uuid'
  const projectId = 'project-uuid'

  function mockStory(realized) {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: storyId, name: 'Old Name', FK_projectId: projectId, realized },
        error: null,
      }),
    })
  }

  function mockProductOwner() {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ProjectRoles: { projectRole: 'Product Owner' } },
        error: null,
      }),
    })
  }

  function mockNoSprintLink() {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
  }

  function mockSprintLink() {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: { FK_userStoryId: storyId }, error: null }),
    })
  }

  const validPayload = {
    name: 'New Name',
    description: 'Updated description',
    priorityId: 1,
    businessValue: 10,
    timeComplexity: 5,
  }

  beforeEach(() => vi.clearAllMocks())

  it('successfully edits a story', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })

    const noDupChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
    const updateChain = mockChain({ single: vi.fn().mockResolvedValue({ data: { id: storyId, ...validPayload }, error: null }) })

    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(mockNoSprintLink())
      .mockReturnValueOnce(noDupChain)
      .mockReturnValueOnce(updateChain)

    const result = await editUserStory(storyId, validPayload)
    expect(result).toMatchObject({ name: 'New Name' })
  })

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    await expect(editUserStory(storyId, validPayload)).rejects.toThrow('Not authenticated.')
  })

  it('throws if story is already realized', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(true))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(mockNoSprintLink())

    await expect(editUserStory(storyId, validPayload)).rejects.toThrow('Cannot modify a realized story.')
  })

  it('throws if story is assigned to a sprint', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(mockSprintLink())

    await expect(editUserStory(storyId, validPayload)).rejects.toThrow('Cannot modify a story that has been assigned to a sprint.')
  })

  it('throws if duplicate name exists', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    const dupChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 99 }, error: null }) })

    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(mockNoSprintLink())
      .mockReturnValueOnce(dupChain)

    await expect(editUserStory(storyId, validPayload)).rejects.toThrow('A user story with this name already exists in this project.')
  })

  it('throws if user is not Product Owner or Scrum Master', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockChain({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ProjectRoles: { projectRole: 'Developer' } },
          error: null,
        }),
      }))

    await expect(editUserStory(storyId, validPayload)).rejects.toThrow('Only Product Owners and Scrum Masters can modify stories.')
  })

})

describe('deleteUserStory()', () => {

  const storyId = 1
  const userId = 'user-uuid'
  const projectId = 'project-uuid'

  function mockStory(realized) {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: storyId, name: 'Story', FK_projectId: projectId, realized },
        error: null,
      }),
    })
  }

  function mockProductOwner() {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ProjectRoles: { projectRole: 'Product Owner' } },
        error: null,
      }),
    })
  }

  function mockNoSprintLink() {
    return mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
  }

  beforeEach(() => vi.clearAllMocks())

  it('successfully deletes a story', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    const deleteChain = mockChain({ eq: vi.fn().mockResolvedValue({ error: null }) })

    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(mockNoSprintLink())
      .mockReturnValueOnce(deleteChain)

    const result = await deleteUserStory(storyId)
    expect(result).toBe(true)
  })

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    await expect(deleteUserStory(storyId)).rejects.toThrow('Not authenticated.')
  })

  it('throws if story is already realized', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(true))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(mockNoSprintLink())

    await expect(deleteUserStory(storyId)).rejects.toThrow('Cannot modify a realized story.')
  })

  it('throws if story is assigned to a sprint', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
    supabase.from
      .mockReturnValueOnce(mockStory(null))
      .mockReturnValueOnce(mockProductOwner())
      .mockReturnValueOnce(mockChain({
        maybeSingle: vi.fn().mockResolvedValue({ data: { FK_userStoryId: storyId }, error: null }),
      }))

    await expect(deleteUserStory(storyId)).rejects.toThrow('Cannot modify a story that has been assigned to a sprint.')
  })

})