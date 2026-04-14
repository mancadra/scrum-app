import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSprintBacklog, createTask, acceptTask, finishTask, rejectTask, canAcceptTask, categorizeStoryForKanban, getProjectRolesForUser, getProjectDevelopers, getSprintNumber } from '../../services/tasks'
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
        update:      vi.fn().mockReturnThis(),
        delete:      vi.fn().mockReturnThis(), // ← add this
        eq:          vi.fn().mockReturnThis(),
        neq:         vi.fn().mockReturnThis(), // ← add this
        lte:         vi.fn().mockReturnThis(),
        gte:         vi.fn().mockReturnThis(),
        in:          vi.fn().mockReturnThis(),
        not:         vi.fn().mockReturnThis(),
        is:          vi.fn().mockReturnThis(),
        ilike:       vi.fn().mockReturnThis(),
        single:      vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        ...overrides,
    }
    return chain
}

const now = new Date()
const activeSprintLinks = [{
    FK_sprintId: 1,
    Sprints: {
        startingDate: new Date(now.getTime() - 86400000).toISOString(),
        endingDate:   new Date(now.getTime() + 86400000).toISOString(),
    },
}]
const inactiveSprintLinks = [{
    FK_sprintId: 2,
    Sprints: {
        startingDate: new Date(now.getTime() - 86400000 * 30).toISOString(),
        endingDate:   new Date(now.getTime() - 86400000 * 16).toISOString(),
    },
}]

const mockStory = { id: 1, FK_projectId: 10, realized: false }
const validInput = { description: 'Implement login form', timecomplexity: 3 }

function mockAuth(userId = 'user-uuid') {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
}

// Sets up the first three from() calls: UserStories, SprintUserStories, ProjectUsers
function mockScrumMaster(userId = 'sm-uuid', { story = mockStory, sprintLinks = activeSprintLinks } = {}) {
    mockAuth(userId)
    supabase.from
        .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: story, error: null }) }))
        .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: sprintLinks, error: null }) }))
        .mockReturnValueOnce((() => {
            const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
            c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Scrum Master' } }], error: null })
            return c
        })())
}

function mockDeveloper(userId = 'dev-uuid', { story = mockStory, sprintLinks = activeSprintLinks } = {}) {
    mockAuth(userId)
    supabase.from
        .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: story, error: null }) }))
        .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: sprintLinks, error: null }) }))
        .mockReturnValueOnce((() => {
            const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
            c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Developer' } }], error: null })
            return c
        })())
}

// ---

describe('createTask', () => {
    it('throws if not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(createTask(1, validInput)).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws if user story does not exist', async () => {
        mockAuth()
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        )

        await expect(createTask(999, validInput)).rejects.toThrow('Uporabniška zgodba ni bila najdena.')
    })

    it('throws if user story query fails', async () => {
        mockAuth()
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'story query failed' } }) })
        )

        await expect(createTask(1, validInput)).rejects.toThrow('story query failed')
    })

    it('throws if user story is already realized', async () => {
        mockAuth()
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockStory, realized: true }, error: null }) })
        )

        await expect(createTask(1, validInput)).rejects.toThrow('Ni mogoče dodati nalog realizirani uporabniški zgodbi.')
    })

    it('throws if sprint links query fails', async () => {
        mockAuth()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'sprint query failed' } }) }))

        await expect(createTask(1, validInput)).rejects.toThrow('sprint query failed')
    })

    it('throws if user story is not in any sprint', async () => {
        mockAuth()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }))

        await expect(createTask(1, validInput)).rejects.toThrow('Uporabniška zgodba ni del aktivnega ali prihodnjega sprinta.')
    })

    it('throws if user story is only in a past sprint', async () => {
        mockAuth()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: inactiveSprintLinks, error: null }) }))

        await expect(createTask(1, validInput)).rejects.toThrow('Uporabniška zgodba ni del aktivnega ali prihodnjega sprinta.')
    })

    it('throws if user is not a project member', async () => {
        mockAuth()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: activeSprintLinks, error: null }) }))
            .mockReturnValueOnce((() => {
                const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
                c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: [], error: null })
                return c
            })())

        await expect(createTask(1, validInput)).rejects.toThrow('Niste član tega projekta.')
    })

    it('throws if membership query fails', async () => {
        mockAuth()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: activeSprintLinks, error: null }) }))
            .mockReturnValueOnce((() => {
                const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
                c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: null, error: { message: 'member query failed' } })
                return c
            })())

        await expect(createTask(1, validInput)).rejects.toThrow('member query failed')
    })

    it('throws if user is a Product Owner', async () => {
        mockAuth('po-uuid')
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: activeSprintLinks, error: null }) }))
            .mockReturnValueOnce((() => {
                const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
                c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Product Owner' } }], error: null })
                return c
            })())

        await expect(createTask(1, validInput)).rejects.toThrow('Samo skrbniki metodologije in razvijalci lahko ustvarjajo naloge.')
    })

    it('throws if description is missing', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, description: '' })).rejects.toThrow('Opis je obvezen.')
    })

    it('throws if description is only whitespace', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, description: '   ' })).rejects.toThrow('Opis je obvezen.')
    })

    it('throws if time complexity is missing', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, timecomplexity: null })).rejects.toThrow('Časovna zahtevnost je obvezna.')
    })

    it('throws if time complexity is zero', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, timecomplexity: 0 })).rejects.toThrow('Časovna zahtevnost mora biti pozitivno število.')
    })

    it('throws if time complexity is negative', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, timecomplexity: -2 })).rejects.toThrow('Časovna zahtevnost mora biti pozitivno število.')
    })

    it('throws if time complexity is NaN', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, timecomplexity: NaN })).rejects.toThrow('Časovna zahtevnost mora biti pozitivno število.')
    })

    it('throws if proposed developer is not a project member', async () => {
        mockScrumMaster()
        supabase.from.mockReturnValueOnce((() => {
            const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
            c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: [], error: null })
            return c
        })())

        await expect(createTask(1, { ...validInput, FK_proposedDeveloper: 'unknown-uuid' }))
            .rejects.toThrow('Predlagani razvijalec ni član tega projekta.')
    })

    it('throws if proposed developer query fails', async () => {
        mockScrumMaster()
        supabase.from.mockReturnValueOnce((() => {
            const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
            c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: null, error: { message: 'dev query failed' } })
            return c
        })())

        await expect(createTask(1, { ...validInput, FK_proposedDeveloper: 'some-uuid' }))
            .rejects.toThrow('dev query failed')
    })

    it('throws if proposed developer does not have Developer role', async () => {
        mockScrumMaster()
        supabase.from.mockReturnValueOnce((() => {
            const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
            c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Scrum Master' } }], error: null })
            return c
        })())

        await expect(createTask(1, { ...validInput, FK_proposedDeveloper: 'sm-uuid' }))
            .rejects.toThrow('Predlagani razvijalec mora imeti vlogo razvijalca.')
    })

    it('throws if a task with the same description already exists for the story', async () => {
        mockScrumMaster()
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 42 }, error: null }) })
        )

        await expect(createTask(1, validInput)).rejects.toThrow('Naloga s tem opisom za to uporabniško zgodbo že obstaja.')
    })

    it('throws if duplicate check query fails', async () => {
        mockScrumMaster()
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'dup query error' } }) })
        )

        await expect(createTask(1, validInput)).rejects.toThrow('dup query error')
    })

    it('throws if task insert fails', async () => {
        mockScrumMaster()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }))
            .mockReturnValueOnce(mockChain({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }) }))

        await expect(createTask(1, validInput)).rejects.toThrow('insert failed')
    })

    it('creates a task successfully as Scrum Master (no proposed developer)', async () => {
        const mockTask = { id: 5, description: validInput.description, FK_userStoryId: 1 }
        mockScrumMaster()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }))
            .mockReturnValueOnce(mockChain({ single: vi.fn().mockResolvedValue({ data: mockTask, error: null }) }))

        const result = await createTask(1, validInput)

        expect(supabase.from).toHaveBeenCalledWith('Tasks')
        expect(result).toEqual(mockTask)
    })

    it('creates a task successfully as Developer', async () => {
        const mockTask = { id: 6, description: validInput.description, FK_userStoryId: 1 }
        mockDeveloper()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }))
            .mockReturnValueOnce(mockChain({ single: vi.fn().mockResolvedValue({ data: mockTask, error: null }) }))

        const result = await createTask(1, validInput)

        expect(result).toEqual(mockTask)
    })

    it('creates a task with a valid proposed developer', async () => {
        const mockTask = { id: 7, description: validInput.description, FK_userStoryId: 1, FK_proposedDeveloper: 'dev-uuid' }
        mockScrumMaster()
        // Proposed developer check
        supabase.from.mockReturnValueOnce((() => {
            const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
            c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: 'Developer' } }], error: null })
            return c
        })())
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }))
            .mockReturnValueOnce(mockChain({ single: vi.fn().mockResolvedValue({ data: mockTask, error: null }) }))

        const result = await createTask(1, { ...validInput, FK_proposedDeveloper: 'dev-uuid' })

        expect(result).toEqual(mockTask)
    })

    it('inserts task with correct fields', async () => {
        const mockTask = { id: 8, description: validInput.description, FK_userStoryId: 1 }
        mockScrumMaster()
        const dupChain = mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        const insertChain = mockChain({ single: vi.fn().mockResolvedValue({ data: mockTask, error: null }) })
        supabase.from.mockReturnValueOnce(dupChain).mockReturnValueOnce(insertChain)

        await createTask(1, validInput)

        expect(insertChain.insert).toHaveBeenCalledWith({
            description: validInput.description,
            timecomplexity: validInput.timecomplexity,
            FK_userStoryId: 1,
            FK_proposedDeveloper: null,
        })
    })
})

// ---

const mockSprint = { id: 1, FK_projectId: 5, startingDate: '2026-03-01T00:00:00Z', endingDate: '2026-03-31T00:00:00Z' }
const mockStoryRow = { id: 10, name: 'Story A', description: '', businessValue: 5, realized: false, FK_priorityId: 1, Priorities: { priority: 'Must have' } }

function mockMembership(roles = [{ FK_projectRoleId: 2 }], error = null) {
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
    chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ data: error ? null : roles, error })
    supabase.from.mockReturnValueOnce(chain)
}

function mockSprintQuery(data = mockSprint, error = null) {
    supabase.from.mockReturnValueOnce(
        mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data, error }) })
    )
}

function mockSprintStories(data = [{ UserStories: mockStoryRow }], error = null) {
    supabase.from.mockReturnValueOnce(
        mockChain({ eq: vi.fn().mockResolvedValue({ data, error }) })
    )
}

function mockTasksQuery(data = [], error = null) {
    supabase.from.mockReturnValueOnce(
        mockChain({ in: vi.fn().mockResolvedValue({ data, error }) })
    )
}

function mockTimeTablesQuery(data = [], error = null) {
    supabase.from.mockReturnValueOnce(
        mockChain({ is: vi.fn().mockResolvedValue({ data, error }) })
    )
}

function mockAnyLogEntriesQuery(data = [], error = null) {
    supabase.from.mockReturnValueOnce(
        mockChain({ not: vi.fn().mockResolvedValue({ data, error }) })
    )
}

describe('getSprintBacklog', () => {
    it('throws if not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(getSprintBacklog(5)).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws if membership query fails', async () => {
        mockAuth()
        mockMembership(null, { message: 'membership query failed' })

        await expect(getSprintBacklog(5)).rejects.toThrow('membership query failed')
    })

    it('throws if user is not a project member', async () => {
        mockAuth()
        mockMembership([])

        await expect(getSprintBacklog(5)).rejects.toThrow('Niste član tega projekta.')
    })

    it('throws if sprint query fails', async () => {
        mockAuth()
        mockMembership()
        mockSprintQuery(null, { message: 'sprint query failed' })

        await expect(getSprintBacklog(5)).rejects.toThrow('sprint query failed')
    })

    it('throws if no active sprint exists', async () => {
        mockAuth()
        mockMembership()
        mockSprintQuery(null)

        await expect(getSprintBacklog(5)).rejects.toThrow('Za ta projekt ni aktivnega sprinta.')
    })

    it('throws if sprint stories query fails', async () => {
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories(null, { message: 'stories query failed' })

        await expect(getSprintBacklog(5)).rejects.toThrow('stories query failed')
    })

    it('returns sprint with empty stories array when sprint has no stories', async () => {
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories([])

        const result = await getSprintBacklog(5)
        expect(result.sprint).toEqual(mockSprint)
        expect(result.stories).toEqual([])
    })

    it('throws if tasks query fails', async () => {
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories()
        mockTasksQuery(null, { message: 'tasks query failed' })

        await expect(getSprintBacklog(5)).rejects.toThrow('tasks query failed')
    })

    it('throws if timetables query fails', async () => {
        const task = { id: 1, FK_userStoryId: 10, finished: false, FK_acceptedDeveloper: null }
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories()
        mockTasksQuery([task])
        mockTimeTablesQuery(null, { message: 'timetables query failed' })

        await expect(getSprintBacklog(5)).rejects.toThrow('timetables query failed')
    })

    it('skips timetables query when there are no tasks', async () => {
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories()
        mockTasksQuery([]) // no tasks → no TimeTables call

        const result = await getSprintBacklog(5)
        expect(result.stories[0].tasks.unassigned).toEqual([])
        // Only 4 from() calls made (no TimeTables)
        expect(supabase.from).toHaveBeenCalledTimes(4)
    })

    it('categorizes unassigned tasks correctly', async () => {
        const task = { id: 1, FK_userStoryId: 10, finished: false, FK_acceptedDeveloper: null }
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories()
        mockTasksQuery([task])
        mockTimeTablesQuery([]) // no open entries
        mockAnyLogEntriesQuery([]) // no log entries

        const { stories } = await getSprintBacklog(5)
        expect(stories[0].tasks.unassigned).toHaveLength(1)
        expect(stories[0].tasks.unassigned[0].id).toBe(1)
    })

    it('categorizes assigned tasks correctly', async () => {
        const task = { id: 2, FK_userStoryId: 10, finished: false, FK_acceptedDeveloper: 'dev-uuid' }
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories()
        mockTasksQuery([task])
        mockTimeTablesQuery([]) // no open entries → not active
        mockAnyLogEntriesQuery([]) // no log entries

        const { stories } = await getSprintBacklog(5)
        expect(stories[0].tasks.assigned).toHaveLength(1)
        expect(stories[0].tasks.assigned[0].id).toBe(2)
    })

    it('categorizes active tasks correctly', async () => {
        const task = { id: 3, FK_userStoryId: 10, finished: false, FK_acceptedDeveloper: 'dev-uuid' }
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories()
        mockTasksQuery([task])
        mockTimeTablesQuery([{ FK_taskId: 3 }]) // open timetable entry → active
        mockAnyLogEntriesQuery([{ FK_taskId: 3 }]) // has log entries

        const { stories } = await getSprintBacklog(5)
        expect(stories[0].tasks.active).toHaveLength(1)
        expect(stories[0].tasks.active[0].id).toBe(3)
    })

    it('categorizes finished tasks correctly', async () => {
        const task = { id: 4, FK_userStoryId: 10, finished: true, FK_acceptedDeveloper: null }
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories()
        mockTasksQuery([task])
        mockTimeTablesQuery([])
        mockAnyLogEntriesQuery([])

        const { stories } = await getSprintBacklog(5)
        expect(stories[0].tasks.finished).toHaveLength(1)
        expect(stories[0].tasks.finished[0].id).toBe(4)
    })

    it('finished takes priority over active in categorization', async () => {
        // A task marked finished but with an open timetable entry should still be 'finished'
        const task = { id: 5, FK_userStoryId: 10, finished: true, FK_acceptedDeveloper: 'dev-uuid' }
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories()
        mockTasksQuery([task])
        mockTimeTablesQuery([{ FK_taskId: 5 }]) // open entry, but finished wins
        mockAnyLogEntriesQuery([{ FK_taskId: 5 }])

        const { stories } = await getSprintBacklog(5)
        expect(stories[0].tasks.finished).toHaveLength(1)
        expect(stories[0].tasks.active).toHaveLength(0)
    })

    it('returns all four categories populated correctly', async () => {
        const tasks = [
            { id: 1, FK_userStoryId: 10, finished: false, FK_acceptedDeveloper: null },
            { id: 2, FK_userStoryId: 10, finished: false, FK_acceptedDeveloper: 'dev-uuid' },
            { id: 3, FK_userStoryId: 10, finished: false, FK_acceptedDeveloper: 'dev-uuid' },
            { id: 4, FK_userStoryId: 10, finished: true,  FK_acceptedDeveloper: null },
        ]
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories()
        mockTasksQuery(tasks)
        mockTimeTablesQuery([{ FK_taskId: 3 }]) // task 3 is active
        mockAnyLogEntriesQuery([{ FK_taskId: 3 }]) // task 3 has log entries

        const { stories } = await getSprintBacklog(5)
        const t = stories[0].tasks
        expect(t.unassigned).toHaveLength(1)
        expect(t.assigned).toHaveLength(1)
        expect(t.active).toHaveLength(1)
        expect(t.finished).toHaveLength(1)
    })

    it('returns the sprint object', async () => {
        mockAuth()
        mockMembership()
        mockSprintQuery()
        mockSprintStories([])

        const { sprint } = await getSprintBacklog(5)
        expect(sprint).toEqual(mockSprint)
    })
})

const DEV_ID = 'dev-uuid'
const mockUnassignedTask = { id: 10, FK_userStoryId: 1, FK_acceptedDeveloper: null, FK_proposedDeveloper: null, finished: false }

// Sets up from() calls for acceptTask up to (and including) the membership check:
// Tasks → UserStories → SprintUserStories → ProjectUsers
function mockAcceptSetup(userId = DEV_ID, {
    task = mockUnassignedTask,
    story = { id: 1, FK_projectId: 10 },
    sprintLinks = activeSprintLinks,
    role = 'Developer',
} = {}) {
    mockAuth(userId)
    supabase.from
        .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: task, error: null }) }))
        .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: story, error: null }) }))
        .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: sprintLinks, error: null }) }))
        .mockReturnValueOnce((() => {
            const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
            c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: role } }], error: null })
            return c
        })())
}

describe('acceptTask', () => {
    it('throws if not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(acceptTask(10)).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws if task does not exist', async () => {
        mockAuth(DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        )

        await expect(acceptTask(999)).rejects.toThrow('Naloga ni bila najdena.')
    })

    it('throws if task fetch fails', async () => {
        mockAuth(DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'task fetch failed' } }) })
        )

        await expect(acceptTask(10)).rejects.toThrow('task fetch failed')
    })

    it('throws if task is already finished', async () => {
        mockAuth(DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockUnassignedTask, finished: true }, error: null }) })
        )

        await expect(acceptTask(10)).rejects.toThrow('Ni mogoče sprejeti zaključene naloge.')
    })

    it('throws if task is already accepted', async () => {
        mockAuth(DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockUnassignedTask, FK_acceptedDeveloper: 'other-uuid' }, error: null }) })
        )

        await expect(acceptTask(10)).rejects.toThrow('Nalogo je že sprejel drug razvijalec.')
    })

    it('throws if task was proposed to a different developer', async () => {
        mockAcceptSetup(DEV_ID, { task: { ...mockUnassignedTask, FK_proposedDeveloper: 'other-uuid' } })

        await expect(acceptTask(10)).rejects.toThrow('Ta naloga je bila predlagana drugemu razvijalcu.')
    })

    it('throws if story fetch fails', async () => {
        mockAuth(DEV_ID)
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockUnassignedTask, error: null }) }))
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'story fetch failed' } }) }))

        await expect(acceptTask(10)).rejects.toThrow('story fetch failed')
    })

    it('throws if story does not exist', async () => {
        mockAuth(DEV_ID)
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockUnassignedTask, error: null }) }))
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }))

        await expect(acceptTask(10)).rejects.toThrow('Uporabniška zgodba ni bila najdena.')
    })

    it('throws if sprint links query fails', async () => {
        mockAuth(DEV_ID)
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockUnassignedTask, error: null }) }))
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1, FK_projectId: 10 }, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'sprint query failed' } }) }))

        await expect(acceptTask(10)).rejects.toThrow('sprint query failed')
    })

    it('throws if task does not belong to an active sprint', async () => {
        mockAuth(DEV_ID)
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockUnassignedTask, error: null }) }))
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1, FK_projectId: 10 }, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: inactiveSprintLinks, error: null }) }))

        await expect(acceptTask(10)).rejects.toThrow('Naloga ne pripada aktivnemu sprintu.')
    })

    it('throws if user is not a project member', async () => {
        mockAuth(DEV_ID)
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockUnassignedTask, error: null }) }))
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1, FK_projectId: 10 }, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: activeSprintLinks, error: null }) }))
            .mockReturnValueOnce((() => {
                const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
                c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: [], error: null })
                return c
            })())

        await expect(acceptTask(10)).rejects.toThrow('Niste član tega projekta.')
    })

    it('throws if user is not a Developer', async () => {
        mockAcceptSetup(DEV_ID, { role: 'Scrum Master' })

        await expect(acceptTask(10)).rejects.toThrow('Samo razvijalci lahko sprejemajo naloge.')
    })

    it('throws if task update fails', async () => {
        mockAcceptSetup()
        supabase.from.mockReturnValueOnce(
            mockChain({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }) })
        )

        await expect(acceptTask(10)).rejects.toThrow('update failed')
    })

    it('accepts a task with no proposed developer', async () => {
        const updated = { ...mockUnassignedTask, FK_acceptedDeveloper: DEV_ID }
        mockAcceptSetup()
        supabase.from.mockReturnValueOnce(
            mockChain({ single: vi.fn().mockResolvedValue({ data: updated, error: null }) })
        )

        const result = await acceptTask(10)
        expect(result.FK_acceptedDeveloper).toBe(DEV_ID)
    })

    it('accepts a task proposed to the current developer', async () => {
        const taskProposedToMe = { ...mockUnassignedTask, FK_proposedDeveloper: DEV_ID }
        const updated = { ...taskProposedToMe, FK_acceptedDeveloper: DEV_ID }
        mockAcceptSetup(DEV_ID, { task: taskProposedToMe })
        supabase.from.mockReturnValueOnce(
            mockChain({ single: vi.fn().mockResolvedValue({ data: updated, error: null }) })
        )

        const result = await acceptTask(10)
        expect(result.FK_acceptedDeveloper).toBe(DEV_ID)
    })

    it('updates task with the current user as accepted developer', async () => {
        const updated = { ...mockUnassignedTask, FK_acceptedDeveloper: DEV_ID }
        mockAcceptSetup()
        const updateChain = mockChain({ single: vi.fn().mockResolvedValue({ data: updated, error: null }) })
        supabase.from.mockReturnValueOnce(updateChain)

        await acceptTask(10)

        expect(updateChain.update).toHaveBeenCalledWith({ FK_acceptedDeveloper: DEV_ID })
    })
})

// ---

const mockUnfinishedTask = { id: 20, FK_acceptedDeveloper: DEV_ID, finished: false }
const mockFinishedTask   = { id: 21, FK_acceptedDeveloper: DEV_ID, finished: true }

function mockTaskFetch(task) {
    supabase.from.mockReturnValueOnce(
        mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: task, error: null }) })
    )
}

function mockTimetableUpdate(error = null) {
    supabase.from.mockReturnValueOnce(
        mockChain({ is: vi.fn().mockResolvedValue({ error }) })
    )
}

function mockTaskUpdate(result) {
    supabase.from.mockReturnValueOnce(
        mockChain({ single: vi.fn().mockResolvedValue(result) })
    )
}

describe('finishTask', () => {
    it('throws if not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(finishTask(20)).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws if task does not exist', async () => {
        mockAuth(DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        )

        await expect(finishTask(999)).rejects.toThrow('Naloga ni bila najdena.')
    })

    it('throws if task fetch fails', async () => {
        mockAuth(DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'task fetch failed' } }) })
        )

        await expect(finishTask(20)).rejects.toThrow('task fetch failed')
    })

    it('throws if task is already finished', async () => {
        mockAuth(DEV_ID)
        mockTaskFetch(mockFinishedTask)

        await expect(finishTask(21)).rejects.toThrow('Naloga je že zaključena.')
    })

    it('throws if current user did not accept the task', async () => {
        mockAuth('other-uuid')
        mockTaskFetch(mockUnfinishedTask) // accepted by DEV_ID, not 'other-uuid'

        await expect(finishTask(20)).rejects.toThrow('Zaključite lahko samo nalogo, ki ste jo sprejeli.')
    })

    it('throws if task has no accepted developer', async () => {
        mockAuth(DEV_ID)
        mockTaskFetch({ ...mockUnfinishedTask, FK_acceptedDeveloper: null })

        await expect(finishTask(20)).rejects.toThrow('Zaključite lahko samo nalogo, ki ste jo sprejeli.')
    })

    it('throws if timetable update fails', async () => {
        mockAuth(DEV_ID)
        mockTaskFetch(mockUnfinishedTask)
        mockTimetableUpdate({ message: 'timetable update failed' })

        await expect(finishTask(20)).rejects.toThrow('timetable update failed')
    })

    it('throws if task update fails', async () => {
        mockAuth(DEV_ID)
        mockTaskFetch(mockUnfinishedTask)
        mockTimetableUpdate()
        mockTaskUpdate({ data: null, error: { message: 'task update failed' } })

        await expect(finishTask(20)).rejects.toThrow('task update failed')
    })

    it('marks task as finished successfully', async () => {
        const finished = { ...mockUnfinishedTask, finished: true }
        mockAuth(DEV_ID)
        mockTaskFetch(mockUnfinishedTask)
        mockTimetableUpdate()
        mockTaskUpdate({ data: finished, error: null })

        const result = await finishTask(20)
        expect(result.finished).toBe(true)
        expect(result.id).toBe(20)
    })

    it('updates task with finished: true', async () => {
        const finished = { ...mockUnfinishedTask, finished: true }
        mockAuth(DEV_ID)
        mockTaskFetch(mockUnfinishedTask)
        mockTimetableUpdate()
        const updateChain = mockChain({ single: vi.fn().mockResolvedValue({ data: finished, error: null }) })
        supabase.from.mockReturnValueOnce(updateChain)

        await finishTask(20)

        expect(updateChain.update).toHaveBeenCalledWith({ finished: true })
    })
})

// ---

const baseTask = { id: 1, FK_acceptedDeveloper: null, FK_proposedDeveloper: null, finished: false }

describe('canAcceptTask', () => {
    it('returns false if task is null', () => {
        expect(canAcceptTask(null, 'user-uuid', ['Developer'])).toBe(false)
    })

    it('returns false if task is already accepted', () => {
        expect(canAcceptTask({ ...baseTask, FK_acceptedDeveloper: 'other-uuid' }, 'user-uuid', ['Developer'])).toBe(false)
    })

    it('returns false if task is finished', () => {
        expect(canAcceptTask({ ...baseTask, finished: true }, 'user-uuid', ['Developer'])).toBe(false)
    })

    it('returns false if user is not a Developer', () => {
        expect(canAcceptTask(baseTask, 'user-uuid', ['Scrum Master'])).toBe(false)
    })

    it('returns false if user has no roles', () => {
        expect(canAcceptTask(baseTask, 'user-uuid', [])).toBe(false)
    })

    it('returns true for an unproposed task when user is a Developer', () => {
        expect(canAcceptTask(baseTask, 'user-uuid', ['Developer'])).toBe(true)
    })

    it('returns true when task is proposed to the current user', () => {
        expect(canAcceptTask({ ...baseTask, FK_proposedDeveloper: 'user-uuid' }, 'user-uuid', ['Developer'])).toBe(true)
    })

    it('returns false when task is proposed to a different user', () => {
        expect(canAcceptTask({ ...baseTask, FK_proposedDeveloper: 'other-uuid' }, 'user-uuid', ['Developer'])).toBe(false)
    })

    it('returns false for SM+Developer when task is proposed to someone else', () => {
        expect(canAcceptTask({ ...baseTask, FK_proposedDeveloper: 'other-uuid' }, 'user-uuid', ['Developer', 'Scrum Master'])).toBe(false)
    })

    it('returns true for SM+Developer when task has no proposed developer', () => {
        expect(canAcceptTask(baseTask, 'user-uuid', ['Developer', 'Scrum Master'])).toBe(true)
    })

    it('returns true for SM+Developer when task is proposed to them', () => {
        expect(canAcceptTask({ ...baseTask, FK_proposedDeveloper: 'user-uuid' }, 'user-uuid', ['Developer', 'Scrum Master'])).toBe(true)
    })
})

// ---

describe('categorizeStoryForKanban', () => {
    it('returns unassigned for a default story', () => {
        expect(categorizeStoryForKanban({ accepted: false, realized: false, testing: false, hasTimeLogs: false })).toBe('unassigned')
    })

    it('returns active when accepted', () => {
        expect(categorizeStoryForKanban({ accepted: true, realized: false, testing: false, hasTimeLogs: false })).toBe('active')
    })

    it('returns active when has time logs', () => {
        expect(categorizeStoryForKanban({ accepted: false, realized: false, testing: false, hasTimeLogs: true })).toBe('active')
    })

    it('returns active when both accepted and has time logs', () => {
        expect(categorizeStoryForKanban({ accepted: true, realized: false, testing: false, hasTimeLogs: true })).toBe('active')
    })

    it('returns testing when testing is true', () => {
        expect(categorizeStoryForKanban({ accepted: false, realized: false, testing: true, hasTimeLogs: false })).toBe('testing')
    })

    it('returns finished when realized', () => {
        expect(categorizeStoryForKanban({ accepted: false, realized: true, testing: false, hasTimeLogs: false })).toBe('finished')
    })

    it('realized takes priority over testing', () => {
        expect(categorizeStoryForKanban({ accepted: false, realized: true, testing: true, hasTimeLogs: false })).toBe('finished')
    })

    it('testing takes priority over accepted', () => {
        expect(categorizeStoryForKanban({ accepted: true, realized: false, testing: true, hasTimeLogs: false })).toBe('testing')
    })

    it('testing takes priority over hasTimeLogs', () => {
        expect(categorizeStoryForKanban({ accepted: false, realized: false, testing: true, hasTimeLogs: true })).toBe('testing')
    })
})

// ---

const PROPOSED_DEV_ID = 'proposed-dev-uuid'
const ACCEPTED_DEV_ID = 'accepted-dev-uuid'
const mockProposedTask = { id: 30, FK_userStoryId: 1, FK_proposedDeveloper: PROPOSED_DEV_ID, FK_acceptedDeveloper: null, finished: false }
const mockAcceptedTask = { id: 31, FK_userStoryId: 1, FK_proposedDeveloper: null, FK_acceptedDeveloper: ACCEPTED_DEV_ID, finished: false }

function mockRejectSetup(userId = PROPOSED_DEV_ID, { task = mockProposedTask, sprintLinks = activeSprintLinks } = {}) {
    mockAuth(userId)
    supabase.from
        .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: task, error: null }) }))
        .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: sprintLinks, error: null }) }))
}

describe('rejectTask', () => {
    it('throws if not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(rejectTask(30)).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws if task does not exist', async () => {
        mockAuth(PROPOSED_DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        )

        await expect(rejectTask(999)).rejects.toThrow('Naloga ni bila najdena.')
    })

    it('throws if task fetch fails', async () => {
        mockAuth(PROPOSED_DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'task fetch failed' } }) })
        )

        await expect(rejectTask(30)).rejects.toThrow('task fetch failed')
    })

    it('throws if task is finished', async () => {
        mockAuth(PROPOSED_DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockProposedTask, finished: true }, error: null }) })
        )

        await expect(rejectTask(30)).rejects.toThrow('Ni mogoče zavrniti zaključene naloge.')
    })

    it('throws if task is accepted by another developer and not proposed to user', async () => {
        mockAuth(PROPOSED_DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockProposedTask, FK_acceptedDeveloper: 'other-uuid' }, error: null }) })
        )

        await expect(rejectTask(30)).rejects.toThrow('Odpovete se lahko samo nalogi, ki ste jo sprejeli ali vam je bila predlagana.')
    })

    it('throws if user is unrelated to the task', async () => {
        mockAuth('other-uuid')
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockProposedTask, error: null }) })
        )

        await expect(rejectTask(30)).rejects.toThrow('Odpovete se lahko samo nalogi, ki ste jo sprejeli ali vam je bila predlagana.')
    })

    it('throws if sprint links query fails', async () => {
        mockAuth(PROPOSED_DEV_ID)
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockProposedTask, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'sprint query failed' } }) }))

        await expect(rejectTask(30)).rejects.toThrow('sprint query failed')
    })

    it('throws if task is not in an active sprint', async () => {
        mockRejectSetup(PROPOSED_DEV_ID, { sprintLinks: inactiveSprintLinks })

        await expect(rejectTask(30)).rejects.toThrow('Naloga ne pripada aktivnemu sprintu.')
    })

    it('throws if task has no sprint links', async () => {
        mockRejectSetup(PROPOSED_DEV_ID, { sprintLinks: [] })

        await expect(rejectTask(30)).rejects.toThrow('Naloga ne pripada aktivnemu sprintu.')
    })

    it('throws if update fails (proposed path)', async () => {
        mockRejectSetup()
        supabase.from.mockReturnValueOnce(
            mockChain({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }) })
        )

        await expect(rejectTask(30)).rejects.toThrow('update failed')
    })

    it('clears FK_proposedDeveloper when declining a proposal', async () => {
        const updated = { ...mockProposedTask, FK_proposedDeveloper: null }
        mockRejectSetup()
        const updateChain = mockChain({ single: vi.fn().mockResolvedValue({ data: updated, error: null }) })
        supabase.from.mockReturnValueOnce(updateChain)

        await rejectTask(30)

        expect(updateChain.update).toHaveBeenCalledWith({ FK_proposedDeveloper: null })
    })

    it('returns updated task when declining a proposal', async () => {
        const updated = { ...mockProposedTask, FK_proposedDeveloper: null }
        mockRejectSetup()
        supabase.from.mockReturnValueOnce(
            mockChain({ single: vi.fn().mockResolvedValue({ data: updated, error: null }) })
        )

        const result = await rejectTask(30)

        expect(result.FK_proposedDeveloper).toBeNull()
    })

    // --- giving up an already-accepted task ---

    it('throws if timetable update fails when giving up accepted task', async () => {
        mockRejectSetup(ACCEPTED_DEV_ID, { task: mockAcceptedTask })
        supabase.from.mockReturnValueOnce(
            mockChain({ is: vi.fn().mockResolvedValue({ error: { message: 'timetable update failed' } }) })
        )

        await expect(rejectTask(31)).rejects.toThrow('timetable update failed')
    })

    it('throws if task update fails when giving up accepted task', async () => {
        mockRejectSetup(ACCEPTED_DEV_ID, { task: mockAcceptedTask })
        mockTimetableUpdate()
        supabase.from.mockReturnValueOnce(
            mockChain({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }) })
        )

        await expect(rejectTask(31)).rejects.toThrow('update failed')
    })

    it('clears FK_acceptedDeveloper when giving up accepted task', async () => {
        const updated = { ...mockAcceptedTask, FK_acceptedDeveloper: null }
        mockRejectSetup(ACCEPTED_DEV_ID, { task: mockAcceptedTask })
        mockTimetableUpdate()
        const updateChain = mockChain({ single: vi.fn().mockResolvedValue({ data: updated, error: null }) })
        supabase.from.mockReturnValueOnce(updateChain)

        await rejectTask(31)

        expect(updateChain.update).toHaveBeenCalledWith({ FK_acceptedDeveloper: null })
    })

    it('returns updated task when giving up accepted task', async () => {
        const updated = { ...mockAcceptedTask, FK_acceptedDeveloper: null }
        mockRejectSetup(ACCEPTED_DEV_ID, { task: mockAcceptedTask })
        mockTimetableUpdate()
        supabase.from.mockReturnValueOnce(
            mockChain({ single: vi.fn().mockResolvedValue({ data: updated, error: null }) })
        )

        const result = await rejectTask(31)

        expect(result.FK_acceptedDeveloper).toBeNull()
    })
})

// ---

function mockDoubleEqQuery(data, error = null) {
    const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
    c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data, error })
    supabase.from.mockReturnValueOnce(c)
}

describe('getProjectRolesForUser', () => {
    it('throws if query fails', async () => {
        mockDoubleEqQuery(null, { message: 'roles query failed' })

        await expect(getProjectRolesForUser(10, 'user-uuid')).rejects.toThrow('roles query failed')
    })

    it('returns empty array if memberships is null', async () => {
        mockDoubleEqQuery(null)

        const result = await getProjectRolesForUser(10, 'user-uuid')
        expect(result).toEqual([])
    })

    it('returns empty array if user has no memberships', async () => {
        mockDoubleEqQuery([])

        const result = await getProjectRolesForUser(10, 'user-uuid')
        expect(result).toEqual([])
    })

    it('returns array of role strings', async () => {
        mockDoubleEqQuery([
            { ProjectRoles: { projectRole: 'Developer' } },
            { ProjectRoles: { projectRole: 'Scrum Master' } },
        ])

        const result = await getProjectRolesForUser(10, 'user-uuid')
        expect(result).toEqual(['Developer', 'Scrum Master'])
    })

    it('filters out null roles', async () => {
        mockDoubleEqQuery([
            { ProjectRoles: null },
            { ProjectRoles: { projectRole: 'Developer' } },
        ])

        const result = await getProjectRolesForUser(10, 'user-uuid')
        expect(result).toEqual(['Developer'])
    })
})

// ---

describe('getProjectDevelopers', () => {
    it('throws if query fails', async () => {
        mockDoubleEqQuery(null, { message: 'developers query failed' })

        await expect(getProjectDevelopers(10)).rejects.toThrow('developers query failed')
    })

    it('returns empty array if no data', async () => {
        mockDoubleEqQuery(null)

        const result = await getProjectDevelopers(10)
        expect(result).toEqual([])
    })

    it('returns correctly shaped developer objects', async () => {
        mockDoubleEqQuery([{
            FK_userId: 'dev-uuid',
            Users: { id: 'dev-uuid', username: 'jdoe', name: 'Jane', surname: 'Doe' },
            ProjectRoles: { projectRole: 'Developer' },
        }])

        const result = await getProjectDevelopers(10)
        expect(result).toEqual([{ id: 'dev-uuid', username: 'jdoe', full_name: 'Jane Doe' }])
    })

    it('sets full_name to null when name or surname is missing', async () => {
        mockDoubleEqQuery([{
            FK_userId: 'dev-uuid',
            Users: { id: 'dev-uuid', username: 'jdoe', name: null, surname: null },
            ProjectRoles: { projectRole: 'Developer' },
        }])

        const result = await getProjectDevelopers(10)
        expect(result[0].full_name).toBeNull()
    })

    it('filters out rows where ProjectRoles is not Developer', async () => {
        mockDoubleEqQuery([
            {
                FK_userId: 'sm-uuid',
                Users: { id: 'sm-uuid', username: 'sm', name: 'Scrum', surname: 'Master' },
                ProjectRoles: null,
            },
            {
                FK_userId: 'dev-uuid',
                Users: { id: 'dev-uuid', username: 'dev', name: 'Dev', surname: 'User' },
                ProjectRoles: { projectRole: 'Developer' },
            },
        ])

        const result = await getProjectDevelopers(10)
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('dev-uuid')
    })

    it('filters out soft-deleted developers', async () => {
        mockDoubleEqQuery([
            {
                FK_userId: 'deleted-uuid',
                Users: { id: 'deleted-uuid', username: 'gone', name: 'Gone', surname: 'User', deleted_at: '2026-01-01T00:00:00Z' },
                ProjectRoles: { projectRole: 'Developer' },
            },
            {
                FK_userId: 'active-uuid',
                Users: { id: 'active-uuid', username: 'active', name: 'Active', surname: 'Dev', deleted_at: null },
                ProjectRoles: { projectRole: 'Developer' },
            },
        ])

        const result = await getProjectDevelopers(10)
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('active-uuid')
    })
})

// ---

function mockSprintsListQuery(data, error = null) {
    supabase.from.mockReturnValueOnce(
        mockChain({ order: vi.fn().mockResolvedValue({ data, error }) })
    )
}

describe('getSprintNumber', () => {
    it('throws if query fails', async () => {
        mockSprintsListQuery(null, { message: 'sprints query failed' })

        await expect(getSprintNumber(10, 1)).rejects.toThrow('sprints query failed')
    })

    it('returns null if data is null', async () => {
        mockSprintsListQuery(null)

        const result = await getSprintNumber(10, 1)
        expect(result).toBeNull()
    })

    it('returns null if sprint is not found', async () => {
        mockSprintsListQuery([{ id: 1, startingDate: '2026-01-01' }, { id: 2, startingDate: '2026-02-01' }])

        const result = await getSprintNumber(10, 99)
        expect(result).toBeNull()
    })

    it('returns 1 for the first sprint', async () => {
        mockSprintsListQuery([{ id: 1, startingDate: '2026-01-01' }, { id: 2, startingDate: '2026-02-01' }])

        const result = await getSprintNumber(10, 1)
        expect(result).toBe(1)
    })

    it('returns 2 for the second sprint', async () => {
        mockSprintsListQuery([{ id: 1, startingDate: '2026-01-01' }, { id: 2, startingDate: '2026-02-01' }])

        const result = await getSprintNumber(10, 2)
        expect(result).toBe(2)
    })

    it('matches sprint id as string or number', async () => {
        mockSprintsListQuery([{ id: 3, startingDate: '2026-03-01' }])

        const result = await getSprintNumber(10, '3')
        expect(result).toBe(1)
    })
})

// ─── editTask / deleteTask ────────────────────────────────────────────────────

import { editTask, deleteTask } from '../../services/tasks'

const mockTaskData = {
  id: 'task-uuid',
  description: 'Old description',
  timecomplexity: 3,
  FK_userStoryId: 'story-uuid',
  FK_proposedDeveloper: null,
  FK_acceptedDeveloper: null,
  finished: false,
}

const mockStoryData = { id: 'story-uuid', FK_projectId: 'project-uuid' }

function mockTaskFetchEdit(task = mockTaskData) {
  supabase.from.mockReturnValueOnce(
    mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: task, error: null }) })
  )
}

function mockStoryFetch(story = mockStoryData) {
  supabase.from.mockReturnValueOnce(
    mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: story, error: null }) })
  )
}

function mockMembershipEdit(role = 'Scrum Master') {
  const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
  c.eq
    .mockReturnValueOnce(c)
    .mockResolvedValueOnce({ data: [{ ProjectRoles: { projectRole: role } }], error: null })
  supabase.from.mockReturnValueOnce(c)
}

function mockNoDuplicateEdit() {
  supabase.from.mockReturnValueOnce(
    mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
  )
}

function mockUpdateEdit(data) {
  supabase.from.mockReturnValueOnce(
    mockChain({ single: vi.fn().mockResolvedValue({ data, error: null }) })
  )
}

function mockDeleteEdit() {
  supabase.from.mockReturnValueOnce(
    mockChain({ eq: vi.fn().mockResolvedValue({ error: null }) })
  )
}

// ─── editTask ─────────────────────────────────────────────────────────────────

describe('editTask', () => {

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    await expect(editTask('task-uuid', { description: 'New' })).rejects.toThrow('Niste prijavljeni.')
  })

  it('throws if task not found', async () => {
    mockAuth()
    supabase.from.mockReturnValueOnce(
      mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
    )

    await expect(editTask('task-uuid', { description: 'New' })).rejects.toThrow('Naloga ni bila najdena.')
  })

  it('throws if user is not Scrum Master or Developer', async () => {
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Product Owner')

    await expect(editTask('task-uuid', { description: 'New' }))
      .rejects.toThrow('Samo skrbniki metodologije in razvijalci lahko urejajo naloge.')
  })

  it('throws if duplicate description exists', async () => {
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Scrum Master')
    supabase.from.mockReturnValueOnce(
      mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'other-task' }, error: null }) })
    )

    await expect(editTask('task-uuid', { description: 'Duplicate' }))
      .rejects.toThrow('Naloga s tem opisom za to uporabniško zgodbo že obstaja.')
  })

  it('throws if timecomplexity is negative', async () => {
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Scrum Master')
    mockNoDuplicateEdit()

    await expect(editTask('task-uuid', { description: 'New', timecomplexity: -1 }))
      .rejects.toThrow('Časovna zahtevnost mora biti pozitivno število.')
  })

  it('throws if timecomplexity is zero', async () => {
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Scrum Master')
    mockNoDuplicateEdit()

    await expect(editTask('task-uuid', { description: 'New', timecomplexity: 0 }))
      .rejects.toThrow('Časovna zahtevnost mora biti pozitivno število.')
  })

  it('throws if proposed developer is not a project member', async () => {
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Scrum Master')
    mockNoDuplicateEdit()
    const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
    c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({ data: [], error: null })
    supabase.from.mockReturnValueOnce(c)

    await expect(editTask('task-uuid', { description: 'New', FK_proposedDeveloper: 'unknown-uuid' }))
      .rejects.toThrow('Predlagani razvijalec ni član tega projekta.')
  })

  it('throws if proposed developer does not have Developer role', async () => {
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Scrum Master')
    mockNoDuplicateEdit()
    const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
    c.eq.mockReturnValueOnce(c).mockResolvedValueOnce({
      data: [{ ProjectRoles: { projectRole: 'Scrum Master' } }],
      error: null,
    })
    supabase.from.mockReturnValueOnce(c)

    await expect(editTask('task-uuid', { description: 'New', FK_proposedDeveloper: 'sm-uuid' }))
      .rejects.toThrow('Predlagani razvijalec mora imeti vlogo razvijalca.')
  })

  it('successfully edits a task as Scrum Master', async () => {
    const updated = { ...mockTaskData, description: 'New description', timecomplexity: 5 }
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Scrum Master')
    mockNoDuplicateEdit()
    mockUpdateEdit(updated)

    const result = await editTask('task-uuid', { description: 'New description', timecomplexity: 5 })
    expect(result).toMatchObject({ description: 'New description', timecomplexity: 5 })
  })

  it('successfully edits a task as Developer', async () => {
    const updated = { ...mockTaskData, description: 'New description' }
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Developer')
    mockNoDuplicateEdit()
    mockUpdateEdit(updated)

    const result = await editTask('task-uuid', { description: 'New description' })
    expect(result).toMatchObject({ description: 'New description' })
  })

})

// ─── deleteTask ───────────────────────────────────────────────────────────────

describe('deleteTask', () => {

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    await expect(deleteTask('task-uuid')).rejects.toThrow('Niste prijavljeni.')
  })

  it('throws if task not found', async () => {
    mockAuth()
    supabase.from.mockReturnValueOnce(
      mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
    )

    await expect(deleteTask('task-uuid')).rejects.toThrow('Naloga ni bila najdena.')
  })

  it('throws if user is not Scrum Master or Developer', async () => {
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Product Owner')

    await expect(deleteTask('task-uuid'))
      .rejects.toThrow('Samo skrbniki metodologije in razvijalci lahko urejajo naloge.')
  })

  it('throws if task has already been accepted by a developer', async () => {
    mockAuth()
    mockTaskFetchEdit({ ...mockTaskData, FK_acceptedDeveloper: 'dev-uuid' })
    mockStoryFetch()
    mockMembershipEdit('Scrum Master')

    await expect(deleteTask('task-uuid'))
      .rejects.toThrow('Naloge, ki jo je razvijalec že sprejel, ni mogoče izbrisati.')
  })

  it('successfully deletes a task', async () => {
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Scrum Master')
    mockDeleteEdit()

    const result = await deleteTask('task-uuid')
    expect(result).toBe(true)
  })

  it('successfully deletes a task as Developer', async () => {
    mockAuth()
    mockTaskFetchEdit()
    mockStoryFetch()
    mockMembershipEdit('Developer')
    mockDeleteEdit()

    const result = await deleteTask('task-uuid')
    expect(result).toBe(true)
  })

})