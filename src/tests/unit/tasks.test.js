import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSprintBacklog, createTask, acceptTask, finishTask } from '../../services/tasks'
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
        update:      vi.fn().mockReturnThis(),
        eq:          vi.fn().mockReturnThis(),
        lte:         vi.fn().mockReturnThis(),
        gte:         vi.fn().mockReturnThis(),
        in:          vi.fn().mockReturnThis(),
        not:         vi.fn().mockReturnThis(),
        is:          vi.fn().mockReturnThis(),
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
        .mockReturnValueOnce(mockChain({
            maybeSingle: vi.fn().mockResolvedValue({
                data: { FK_projectRoleId: 2, ProjectRoles: { projectRole: 'Scrum Master' } },
                error: null,
            }),
        }))
}

function mockDeveloper(userId = 'dev-uuid', { story = mockStory, sprintLinks = activeSprintLinks } = {}) {
    mockAuth(userId)
    supabase.from
        .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: story, error: null }) }))
        .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: sprintLinks, error: null }) }))
        .mockReturnValueOnce(mockChain({
            maybeSingle: vi.fn().mockResolvedValue({
                data: { FK_projectRoleId: 3, ProjectRoles: { projectRole: 'Developer' } },
                error: null,
            }),
        }))
}

// ---

describe('createTask', () => {
    it('throws if not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(createTask(1, validInput)).rejects.toThrow('Not authenticated.')
    })

    it('throws if user story does not exist', async () => {
        mockAuth()
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        )

        await expect(createTask(999, validInput)).rejects.toThrow('User story not found.')
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

        await expect(createTask(1, validInput)).rejects.toThrow('Cannot add tasks to a realized user story.')
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

        await expect(createTask(1, validInput)).rejects.toThrow('User story is not part of an active sprint.')
    })

    it('throws if user story is not in an active sprint', async () => {
        mockAuth()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: inactiveSprintLinks, error: null }) }))

        await expect(createTask(1, validInput)).rejects.toThrow('User story is not part of an active sprint.')
    })

    it('throws if user is not a project member', async () => {
        mockAuth()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: activeSprintLinks, error: null }) }))
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }))

        await expect(createTask(1, validInput)).rejects.toThrow('You are not a member of this project.')
    })

    it('throws if membership query fails', async () => {
        mockAuth()
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: activeSprintLinks, error: null }) }))
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'member query failed' } }) }))

        await expect(createTask(1, validInput)).rejects.toThrow('member query failed')
    })

    it('throws if user is a Product Owner', async () => {
        mockAuth('po-uuid')
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockStory, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: activeSprintLinks, error: null }) }))
            .mockReturnValueOnce(mockChain({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { FK_projectRoleId: 1, ProjectRoles: { projectRole: 'Product Owner' } },
                    error: null,
                }),
            }))

        await expect(createTask(1, validInput)).rejects.toThrow('Only Scrum Masters and Developers can create tasks.')
    })

    it('throws if description is missing', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, description: '' })).rejects.toThrow('Description is required.')
    })

    it('throws if description is only whitespace', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, description: '   ' })).rejects.toThrow('Description is required.')
    })

    it('throws if time complexity is missing', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, timecomplexity: null })).rejects.toThrow('Time complexity is required.')
    })

    it('throws if time complexity is zero', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, timecomplexity: 0 })).rejects.toThrow('Time complexity must be a positive integer.')
    })

    it('throws if time complexity is negative', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, timecomplexity: -2 })).rejects.toThrow('Time complexity must be a positive integer.')
    })

    it('throws if time complexity is a float', async () => {
        mockScrumMaster()

        await expect(createTask(1, { ...validInput, timecomplexity: 1.5 })).rejects.toThrow('Time complexity must be a positive integer.')
    })

    it('throws if proposed developer is not a project member', async () => {
        mockScrumMaster()
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        )

        await expect(createTask(1, { ...validInput, FK_proposedDeveloper: 'unknown-uuid' }))
            .rejects.toThrow('Proposed developer is not a member of this project.')
    })

    it('throws if proposed developer query fails', async () => {
        mockScrumMaster()
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'dev query failed' } }) })
        )

        await expect(createTask(1, { ...validInput, FK_proposedDeveloper: 'some-uuid' }))
            .rejects.toThrow('dev query failed')
    })

    it('throws if proposed developer does not have Developer role', async () => {
        mockScrumMaster()
        supabase.from.mockReturnValueOnce(
            mockChain({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { FK_projectRoleId: 2, ProjectRoles: { projectRole: 'Scrum Master' } },
                    error: null,
                }),
            })
        )

        await expect(createTask(1, { ...validInput, FK_proposedDeveloper: 'sm-uuid' }))
            .rejects.toThrow('Proposed developer must have the Developer role.')
    })

    it('throws if a task with the same description already exists for the story', async () => {
        mockScrumMaster()
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 42 }, error: null }) })
        )

        await expect(createTask(1, validInput)).rejects.toThrow('A task with this description already exists for this user story.')
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
        supabase.from.mockReturnValueOnce(
            mockChain({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { FK_projectRoleId: 3, ProjectRoles: { projectRole: 'Developer' } },
                    error: null,
                }),
            })
        )
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

function mockMembership(data = { FK_projectRoleId: 2 }, error = null) {
    supabase.from.mockReturnValueOnce(
        mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data, error }) })
    )
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

describe('getSprintBacklog', () => {
    it('throws if not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(getSprintBacklog(5)).rejects.toThrow('Not authenticated.')
    })

    it('throws if membership query fails', async () => {
        mockAuth()
        mockMembership(null, { message: 'membership query failed' })

        await expect(getSprintBacklog(5)).rejects.toThrow('membership query failed')
    })

    it('throws if user is not a project member', async () => {
        mockAuth()
        mockMembership(null)

        await expect(getSprintBacklog(5)).rejects.toThrow('You are not a member of this project.')
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

        await expect(getSprintBacklog(5)).rejects.toThrow('No active sprint found for this project.')
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
        .mockReturnValueOnce(mockChain({
            maybeSingle: vi.fn().mockResolvedValue({
                data: { ProjectRoles: { projectRole: role } },
                error: null,
            }),
        }))
}

describe('acceptTask', () => {
    it('throws if not authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

        await expect(acceptTask(10)).rejects.toThrow('Not authenticated.')
    })

    it('throws if task does not exist', async () => {
        mockAuth(DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        )

        await expect(acceptTask(999)).rejects.toThrow('Task not found.')
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

        await expect(acceptTask(10)).rejects.toThrow('Cannot accept a finished task.')
    })

    it('throws if task is already accepted', async () => {
        mockAuth(DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockUnassignedTask, FK_acceptedDeveloper: 'other-uuid' }, error: null }) })
        )

        await expect(acceptTask(10)).rejects.toThrow('Task has already been accepted by another developer.')
    })

    it('throws if task was proposed to a different developer', async () => {
        mockAuth(DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockUnassignedTask, FK_proposedDeveloper: 'other-uuid' }, error: null }) })
        )

        await expect(acceptTask(10)).rejects.toThrow('This task was proposed to a different developer.')
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

        await expect(acceptTask(10)).rejects.toThrow('User story not found.')
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

        await expect(acceptTask(10)).rejects.toThrow('Task does not belong to an active sprint.')
    })

    it('throws if user is not a project member', async () => {
        mockAuth(DEV_ID)
        supabase.from
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: mockUnassignedTask, error: null }) }))
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1, FK_projectId: 10 }, error: null }) }))
            .mockReturnValueOnce(mockChain({ eq: vi.fn().mockResolvedValue({ data: activeSprintLinks, error: null }) }))
            .mockReturnValueOnce(mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }))

        await expect(acceptTask(10)).rejects.toThrow('You are not a member of this project.')
    })

    it('throws if user is not a Developer', async () => {
        mockAcceptSetup(DEV_ID, { role: 'Scrum Master' })

        await expect(acceptTask(10)).rejects.toThrow('Only Developers can accept tasks.')
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

        await expect(finishTask(20)).rejects.toThrow('Not authenticated.')
    })

    it('throws if task does not exist', async () => {
        mockAuth(DEV_ID)
        supabase.from.mockReturnValueOnce(
            mockChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        )

        await expect(finishTask(999)).rejects.toThrow('Task not found.')
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

        await expect(finishTask(21)).rejects.toThrow('Task is already finished.')
    })

    it('throws if current user did not accept the task', async () => {
        mockAuth('other-uuid')
        mockTaskFetch(mockUnfinishedTask) // accepted by DEV_ID, not 'other-uuid'

        await expect(finishTask(20)).rejects.toThrow('You can only finish a task you have accepted.')
    })

    it('throws if task has no accepted developer', async () => {
        mockAuth(DEV_ID)
        mockTaskFetch({ ...mockUnfinishedTask, FK_acceptedDeveloper: null })

        await expect(finishTask(20)).rejects.toThrow('You can only finish a task you have accepted.')
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
