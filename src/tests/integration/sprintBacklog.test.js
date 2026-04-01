import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from '../../services/auth'
import { getSprintBacklog } from '../../services/tasks'
import { supabase } from '../../config/supabase'

const TEST_USERNAME = 'testuser01'
const TEST_PASSWORD = 'testpassword123!'

let TEST_PROJECT_ID
let TEST_USER_ID
let TEST_SPRINT_ID
let TEST_STORY_ID
let savedSession
const createdTaskIds = []
const createdTimetableIds = []

beforeAll(async () => {
    await signIn(TEST_USERNAME, TEST_PASSWORD)

    const { data: { session } } = await supabase.auth.getSession()
    TEST_USER_ID = session?.user?.id
    savedSession = session

    const { data: project, error: projectError } = await supabase
        .from('Projects')
        .insert({ name: `SprintBacklog Test ${Date.now()}`, description: 'temp integration test project' })
        .select()
        .single()
    if (projectError) throw new Error(`beforeAll: could not create project: ${projectError.message}`)
    TEST_PROJECT_ID = project.id

    const { data: roles } = await supabase.from('ProjectRoles').select('id, projectRole')
    const smRole = roles?.find(r => r.projectRole === 'Scrum Master')
    if (!smRole) throw new Error('beforeAll: Scrum Master role not found')

    const { error: memberError } = await supabase
        .from('ProjectUsers')
        .insert({ FK_projectId: TEST_PROJECT_ID, FK_userId: TEST_USER_ID, FK_projectRoleId: smRole.id })
    if (memberError) throw new Error(`beforeAll: could not add member: ${memberError.message}`)

    const { data: priorities } = await supabase.from('Priorities').select('id').limit(1)
    if (!priorities || priorities.length === 0) throw new Error('Priorities table is empty.')

    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .insert({ name: `SB Story ${Date.now()}`, FK_projectId: TEST_PROJECT_ID, FK_priorityId: priorities[0].id, businessValue: 5 })
        .select()
        .single()
    if (storyError) throw new Error(`beforeAll: could not create story: ${storyError.message}`)
    TEST_STORY_ID = story.id

    const { data: sprint, error: sprintError } = await supabase
        .from('Sprints')
        .insert({
            FK_projectId: TEST_PROJECT_ID,
            startingDate: new Date(Date.now() - 86400000).toISOString(),
            endingDate: new Date(Date.now() + 86400000 * 14).toISOString(),
            startingSpeed: 40,
        })
        .select()
        .single()
    if (sprintError) throw new Error(`beforeAll: could not create sprint: ${sprintError.message}`)
    TEST_SPRINT_ID = sprint.id

    const { error: susError } = await supabase
        .from('SprintUserStories')
        .insert({ FK_sprintId: TEST_SPRINT_ID, FK_userStoryId: TEST_STORY_ID })
    if (susError) throw new Error(`beforeAll: could not assign story to sprint: ${susError.message}`)

    // Create one task per category
    const { data: unassigned } = await supabase
        .from('Tasks')
        .insert({ FK_userStoryId: TEST_STORY_ID, description: 'Unassigned task', timecomplexity: 2 })
        .select().single()
    createdTaskIds.push(unassigned.id)

    const { data: assigned } = await supabase
        .from('Tasks')
        .insert({ FK_userStoryId: TEST_STORY_ID, description: 'Assigned task', timecomplexity: 3, FK_acceptedDeveloper: TEST_USER_ID })
        .select().single()
    createdTaskIds.push(assigned.id)

    const { data: finished } = await supabase
        .from('Tasks')
        .insert({ FK_userStoryId: TEST_STORY_ID, description: 'Finished task', timecomplexity: 1, finished: true })
        .select().single()
    createdTaskIds.push(finished.id)

    const { data: active } = await supabase
        .from('Tasks')
        .insert({ FK_userStoryId: TEST_STORY_ID, description: 'Active task', timecomplexity: 4, FK_acceptedDeveloper: TEST_USER_ID })
        .select().single()
    createdTaskIds.push(active.id)

    const { data: tt, error: ttError } = await supabase
        .from('TimeTables')
        .insert({ FK_taskId: active.id, FK_userId: TEST_USER_ID, starttime: new Date().toISOString(), stoptime: null })
        .select().single()
    if (ttError) throw new Error(`beforeAll: could not create timetable entry: ${ttError.message}`)
    createdTimetableIds.push(tt.id)
})

afterAll(async () => {
    if (createdTimetableIds.length > 0) {
        await supabase.from('TimeTables').delete().in('id', createdTimetableIds)
    }
    if (createdTaskIds.length > 0) {
        await supabase.from('Tasks').delete().in('id', createdTaskIds)
    }
    if (TEST_SPRINT_ID) {
        await supabase.from('SprintUserStories').delete().eq('FK_sprintId', TEST_SPRINT_ID)
        await supabase.from('Sprints').delete().eq('id', TEST_SPRINT_ID)
    }
    if (TEST_STORY_ID) {
        await supabase.from('UserStories').delete().eq('id', TEST_STORY_ID)
    }
    if (TEST_PROJECT_ID) {
        await supabase.from('ProjectUsers').delete().eq('FK_projectId', TEST_PROJECT_ID)
        await supabase.from('Projects').delete().eq('id', TEST_PROJECT_ID)
    }
})

describe('getSprintBacklog', () => {
    it('throws if not authenticated', async () => {
        await supabase.auth.signOut({ scope: 'local' })
        await expect(getSprintBacklog(TEST_PROJECT_ID)).rejects.toThrow('Niste prijavljeni.')
        await signIn(TEST_USERNAME, TEST_PASSWORD)
    })

    it('throws if user is not a member of the project', async () => {
        let otherProjectId
        try {
            const { data: other } = await supabase
                .from('Projects')
                .insert({ name: `Other SB Project ${Date.now()}`, description: 'temp' })
                .select().single()

            otherProjectId = other?.id

            await expect(getSprintBacklog(otherProjectId)).rejects.toThrow('Niste član tega projekta.')
        } finally {
            if (otherProjectId) {
                await supabase.from('Projects').delete().eq('id', otherProjectId)
            }
        }
    })

    it('throws if there is no active sprint', async () => {
        let noSprintProjectId
        try {
            const { data: noSprintProject } = await supabase
                .from('Projects')
                .insert({ name: `No Sprint Project ${Date.now()}`, description: 'temp' })
                .select().single()

            noSprintProjectId = noSprintProject?.id

            const { data: roles } = await supabase.from('ProjectRoles').select('id, projectRole')
            const smRole = roles?.find(r => r.projectRole === 'Scrum Master')
            await supabase.from('ProjectUsers').insert({ FK_projectId: noSprintProjectId, FK_userId: TEST_USER_ID, FK_projectRoleId: smRole.id })

            await expect(getSprintBacklog(noSprintProjectId)).rejects.toThrow('Za ta projekt ni aktivnega sprinta.')
        } finally {
            if (noSprintProjectId) {
                await supabase.from('ProjectUsers').delete().eq('FK_projectId', noSprintProjectId)
                await supabase.from('Projects').delete().eq('id', noSprintProjectId)
            }
        }
    })

    it('returns sprint and stories with tasks in all four categories', async () => {
        const result = await getSprintBacklog(TEST_PROJECT_ID)

        expect(result.sprint).toBeDefined()
        expect(result.sprint.id).toBe(TEST_SPRINT_ID)
        expect(result.stories).toBeDefined()
        expect(result.stories.length).toBeGreaterThan(0)

        const story = result.stories.find(s => s.id === TEST_STORY_ID)
        expect(story).toBeDefined()
        expect(story.tasks.unassigned.length).toBe(1)
        expect(story.tasks.assigned.length).toBe(1)
        expect(story.tasks.finished.length).toBe(1)
        expect(story.tasks.active.length).toBe(1)
    })

    it('correctly categorizes unassigned tasks', async () => {
        const { stories } = await getSprintBacklog(TEST_PROJECT_ID)
        const story = stories.find(s => s.id === TEST_STORY_ID)
        const task = story.tasks.unassigned[0]

        expect(task.description).toBe('Unassigned task')
        expect(task.FK_acceptedDeveloper).toBeNull()
        expect(task.finished).toBeFalsy()
    })

    it('correctly categorizes assigned tasks', async () => {
        const { stories } = await getSprintBacklog(TEST_PROJECT_ID)
        const story = stories.find(s => s.id === TEST_STORY_ID)
        const task = story.tasks.assigned[0]

        expect(task.description).toBe('Assigned task')
        expect(task.FK_acceptedDeveloper).toBe(TEST_USER_ID)
        expect(task.finished).toBeFalsy()
    })

    it('correctly categorizes finished tasks', async () => {
        const { stories } = await getSprintBacklog(TEST_PROJECT_ID)
        const story = stories.find(s => s.id === TEST_STORY_ID)
        const task = story.tasks.finished[0]

        expect(task.description).toBe('Finished task')
        expect(task.finished).toBe(true)
    })

    it('correctly categorizes active tasks', async () => {
        const { stories } = await getSprintBacklog(TEST_PROJECT_ID)
        const story = stories.find(s => s.id === TEST_STORY_ID)
        const task = story.tasks.active[0]

        expect(task.description).toBe('Active task')
        expect(task.finished).toBeFalsy()
        expect(task.FK_acceptedDeveloper).toBe(TEST_USER_ID)
    })

    it('returns empty stories array when active sprint has no stories', async () => {
        const { data: emptyProject } = await supabase
            .from('Projects')
            .insert({ name: `Empty Sprint Project ${Date.now()}`, description: 'temp' })
            .select().single()

        const { data: roles } = await supabase.from('ProjectRoles').select('id, projectRole')
        const smRole = roles?.find(r => r.projectRole === 'Scrum Master')
        await supabase.from('ProjectUsers').insert({ FK_projectId: emptyProject.id, FK_userId: TEST_USER_ID, FK_projectRoleId: smRole.id })

        const { data: emptySprint } = await supabase
            .from('Sprints')
            .insert({
                FK_projectId: emptyProject.id,
                startingDate: new Date(Date.now() - 86400000).toISOString(),
                endingDate: new Date(Date.now() + 86400000 * 7).toISOString(),
                startingSpeed: 20,
            })
            .select().single()

        const result = await getSprintBacklog(emptyProject.id)
        expect(result.sprint.id).toBe(emptySprint.id)
        expect(result.stories).toEqual([])

        await supabase.from('Sprints').delete().eq('id', emptySprint.id)
        await supabase.from('ProjectUsers').delete().eq('FK_projectId', emptyProject.id)
        await supabase.from('Projects').delete().eq('id', emptyProject.id)
    })
})
