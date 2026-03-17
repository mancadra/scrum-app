import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from '../../services/auth'
import { createTask, acceptTask, finishTask } from '../../services/tasks'
import { supabase } from '../../config/supabase'

const TEST_USERNAME = 'testuser01'
const TEST_PASSWORD = 'testpassword123!'

let TEST_PROJECT_ID
let TEST_USER_ID
let TEST_STORY_ID
let TEST_STORY_OUTSIDE_SPRINT_ID
let TEST_SPRINT_ID
const createdTaskIds = []

beforeAll(async () => {
    await signIn(TEST_USERNAME, TEST_PASSWORD)

    const { data: { session } } = await supabase.auth.getSession()
    TEST_USER_ID = session?.user?.id

    // Create a temporary test project
    const { data: project, error: projectError } = await supabase
        .from('Projects')
        .insert({ name: `Tasks Test Project ${Date.now()}`, description: 'temp integration test project' })
        .select()
        .single()

    if (projectError) throw new Error(`beforeAll: could not create project: ${projectError.message}`)
    TEST_PROJECT_ID = project.id

    // Get role IDs
    const { data: roles } = await supabase.from('ProjectRoles').select('id, projectRole')
    const smRole = roles?.find(r => r.projectRole === 'Scrum Master')
    if (!smRole) throw new Error('beforeAll: Scrum Master role not found')

    // Add testuser01 as Scrum Master
    const { error: memberError } = await supabase
        .from('ProjectUsers')
        .insert({ FK_projectId: TEST_PROJECT_ID, FK_userId: TEST_USER_ID, FK_projectRoleId: smRole.id })
    if (memberError) throw new Error(`beforeAll: could not add member: ${memberError.message}`)

    // Get a priority
    const { data: priorities } = await supabase.from('Priorities').select('id').limit(1)
    if (!priorities || priorities.length === 0) {
        throw new Error('Priorities table is empty.')
    }

    // Create user story for the sprint
    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .insert({
            name: `Tasks Test Story ${Date.now()}`,
            description: 'story in active sprint',
            FK_projectId: TEST_PROJECT_ID,
            FK_priorityId: priorities[0].id,
            businessValue: 5,
        })
        .select()
        .single()
    if (storyError) throw new Error(`beforeAll: could not create story: ${storyError.message}`)
    TEST_STORY_ID = story.id

    // Create user story NOT in any sprint (for the "outside sprint" test)
    const { data: storyOutside, error: storyOutsideError } = await supabase
        .from('UserStories')
        .insert({
            name: `Tasks Test Story Outside Sprint ${Date.now()}`,
            description: 'story not in any sprint',
            FK_projectId: TEST_PROJECT_ID,
            FK_priorityId: priorities[0].id,
            businessValue: 3,
        })
        .select()
        .single()
    if (storyOutsideError) throw new Error(`beforeAll: could not create outside story: ${storyOutsideError.message}`)
    TEST_STORY_OUTSIDE_SPRINT_ID = storyOutside.id

    // Create an active sprint (started yesterday, ends in 2 weeks)
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

    // Add the test story to the active sprint
    const { error: susError } = await supabase
        .from('SprintUserStories')
        .insert({ FK_sprintId: TEST_SPRINT_ID, FK_userStoryId: TEST_STORY_ID })
    if (susError) throw new Error(`beforeAll: could not add story to sprint: ${susError.message}`)
})

afterAll(async () => {
    if (createdTaskIds.length > 0) {
        await supabase.from('Tasks').delete().in('id', createdTaskIds)
    }
    if (TEST_SPRINT_ID) {
        await supabase.from('SprintUserStories').delete().eq('FK_sprintId', TEST_SPRINT_ID)
        await supabase.from('Sprints').delete().eq('id', TEST_SPRINT_ID)
    }
    const storyIds = [TEST_STORY_ID, TEST_STORY_OUTSIDE_SPRINT_ID].filter(Boolean)
    if (storyIds.length > 0) {
        await supabase.from('UserStories').delete().in('id', storyIds)
    }
    if (TEST_PROJECT_ID) {
        await supabase.from('ProjectUsers').delete().eq('FK_projectId', TEST_PROJECT_ID)
        await supabase.from('Projects').delete().eq('id', TEST_PROJECT_ID)
    }
})

// ---

describe('createTask', () => {
    it('throws if not authenticated', async () => {
        await supabase.auth.signOut()
        await expect(
            createTask(TEST_STORY_ID, { description: 'Should fail', timecomplexity: 1 })
        ).rejects.toThrow('Not authenticated.')
        await signIn(TEST_USERNAME, TEST_PASSWORD)
    })

    it('throws if user story does not exist', async () => {
        await expect(
            createTask(999999, { description: 'Should fail', timecomplexity: 1 })
        ).rejects.toThrow('User story not found.')
    })

    it('throws if user story is not part of an active sprint', async () => {
        await expect(
            createTask(TEST_STORY_OUTSIDE_SPRINT_ID, { description: 'Outside sprint', timecomplexity: 2 })
        ).rejects.toThrow('User story is not part of an active sprint.')
    })

    it('throws if user story is already realized', async () => {
        // Temporarily mark the story as realized
        await supabase.from('UserStories').update({ realized: true }).eq('id', TEST_STORY_ID)

        await expect(
            createTask(TEST_STORY_ID, { description: 'Should fail', timecomplexity: 1 })
        ).rejects.toThrow('Cannot add tasks to a realized user story.')

        // Restore
        await supabase.from('UserStories').update({ realized: false }).eq('id', TEST_STORY_ID)
    })

    it('throws if user is not a member of the project', async () => {
        const { data: otherProject } = await supabase
            .from('Projects')
            .insert({ name: `Other Project ${Date.now()}`, description: 'not a member' })
            .select()
            .single()

        const { data: priorities } = await supabase.from('Priorities').select('id').limit(1)
        const { data: otherSprint } = await supabase
            .from('Sprints')
            .insert({
                FK_projectId: otherProject.id,
                startingDate: new Date(Date.now() - 86400000).toISOString(),
                endingDate: new Date(Date.now() + 86400000).toISOString(),
                startingSpeed: 10,
            })
            .select()
            .single()

        const { data: otherStory } = await supabase
            .from('UserStories')
            .insert({
                name: `Other Story ${Date.now()}`,
                description: '',
                FK_projectId: otherProject.id,
                FK_priorityId: priorities[0].id,
                businessValue: 1,
            })
            .select()
            .single()

        await supabase.from('SprintUserStories').insert({ FK_sprintId: otherSprint.id, FK_userStoryId: otherStory.id })

        await expect(
            createTask(otherStory.id, { description: 'Should fail', timecomplexity: 1 })
        ).rejects.toThrow('You are not a member of this project.')

        // Cleanup
        await supabase.from('SprintUserStories').delete().eq('FK_sprintId', otherSprint.id)
        await supabase.from('UserStories').delete().eq('id', otherStory.id)
        await supabase.from('Sprints').delete().eq('id', otherSprint.id)
        await supabase.from('Projects').delete().eq('id', otherProject.id)
    })

    it('throws if description is empty', async () => {
        await expect(
            createTask(TEST_STORY_ID, { description: '', timecomplexity: 2 })
        ).rejects.toThrow('Description is required.')
    })

    it('throws if time complexity is missing', async () => {
        await expect(
            createTask(TEST_STORY_ID, { description: 'Some task', timecomplexity: null })
        ).rejects.toThrow('Time complexity is required.')
    })

    it('throws if time complexity is not a positive number', async () => {
        await expect(
            createTask(TEST_STORY_ID, { description: 'Some task', timecomplexity: -1 })
        ).rejects.toThrow('Time complexity must be a positive number.')
    })

    it('throws if proposed developer is not a project member', async () => {
        await expect(
            createTask(TEST_STORY_ID, {
                description: 'Task with unknown developer',
                timecomplexity: 2,
                FK_proposedDeveloper: '00000000-0000-0000-0000-000000000000',
            })
        ).rejects.toThrow('Proposed developer is not a member of this project.')
    })

    it('throws if proposed developer does not have Developer role', async () => {
        // testuser01 is Scrum Master, not Developer — should fail
        await expect(
            createTask(TEST_STORY_ID, {
                description: 'Task with SM as developer',
                timecomplexity: 2,
                FK_proposedDeveloper: TEST_USER_ID,
            })
        ).rejects.toThrow('Proposed developer must have the Developer role.')
    })

    it('creates a task successfully without proposed developer', async () => {
        const description = `Integration Task ${Date.now()}`

        const task = await createTask(TEST_STORY_ID, { description, timecomplexity: 4 })

        createdTaskIds.push(task.id)

        expect(task).toBeDefined()
        expect(task.id).toBeDefined()
        expect(task.description).toBe(description)
        expect(task.FK_userStoryId).toBe(TEST_STORY_ID)
        expect(task.timecomplexity).toBe(4)
        expect(task.FK_proposedDeveloper).toBeNull()
    })

    it('throws if a duplicate task description is created for the same story', async () => {
        const description = `Duplicate Task ${Date.now()}`

        const task = await createTask(TEST_STORY_ID, { description, timecomplexity: 2 })
        createdTaskIds.push(task.id)

        await expect(
            createTask(TEST_STORY_ID, { description, timecomplexity: 3 })
        ).rejects.toThrow('A task with this description already exists for this user story.')
    })
})

// ---

describe('acceptTask', () => {
    let ACCEPT_PROJECT_ID
    let ACCEPT_SPRINT_ID
    let ACCEPT_STORY_ID
    let devRoleId
    let smRoleId
    const acceptTaskIds = []

    beforeAll(async () => {
        const { data: project } = await supabase
            .from('Projects')
            .insert({ name: `AcceptTask Project ${Date.now()}`, description: 'temp' })
            .select().single()
        ACCEPT_PROJECT_ID = project.id

        const { data: roles } = await supabase.from('ProjectRoles').select('id, projectRole')
        const devRole = roles?.find(r => r.projectRole === 'Developer')
        const smRole = roles?.find(r => r.projectRole === 'Scrum Master')
        if (!devRole) throw new Error('beforeAll: Developer role not found')
        if (!smRole) throw new Error('beforeAll: Scrum Master role not found')
        devRoleId = devRole.id
        smRoleId = smRole.id

        await supabase.from('ProjectUsers').insert({
            FK_projectId: ACCEPT_PROJECT_ID,
            FK_userId: TEST_USER_ID,
            FK_projectRoleId: devRoleId,
        })

        const { data: priorities } = await supabase.from('Priorities').select('id').limit(1)

        const { data: story } = await supabase
            .from('UserStories')
            .insert({ name: `Accept Story ${Date.now()}`, FK_projectId: ACCEPT_PROJECT_ID, FK_priorityId: priorities[0].id, businessValue: 3 })
            .select().single()
        ACCEPT_STORY_ID = story.id

        const { data: sprint } = await supabase
            .from('Sprints')
            .insert({
                FK_projectId: ACCEPT_PROJECT_ID,
                startingDate: new Date(Date.now() - 86400000).toISOString(),
                endingDate: new Date(Date.now() + 86400000 * 14).toISOString(),
                startingSpeed: 20,
            })
            .select().single()
        ACCEPT_SPRINT_ID = sprint.id

        await supabase.from('SprintUserStories').insert({ FK_sprintId: ACCEPT_SPRINT_ID, FK_userStoryId: ACCEPT_STORY_ID })
    })

    afterAll(async () => {
        if (acceptTaskIds.length > 0) {
            await supabase.from('Tasks').delete().in('id', acceptTaskIds)
        }
        if (ACCEPT_SPRINT_ID) {
            await supabase.from('SprintUserStories').delete().eq('FK_sprintId', ACCEPT_SPRINT_ID)
            await supabase.from('Sprints').delete().eq('id', ACCEPT_SPRINT_ID)
        }
        if (ACCEPT_STORY_ID) {
            await supabase.from('UserStories').delete().eq('id', ACCEPT_STORY_ID)
        }
        if (ACCEPT_PROJECT_ID) {
            await supabase.from('ProjectUsers').delete().eq('FK_projectId', ACCEPT_PROJECT_ID)
            await supabase.from('Projects').delete().eq('id', ACCEPT_PROJECT_ID)
        }
    })

    it('throws if not authenticated', async () => {
        await supabase.auth.signOut()
        await expect(acceptTask(999999)).rejects.toThrow('Not authenticated.')
        await signIn(TEST_USERNAME, TEST_PASSWORD)
    })

    it('throws if task does not exist', async () => {
        await expect(acceptTask(999999)).rejects.toThrow('Task not found.')
    })

    it('throws if task is already finished', async () => {
        const { data: task } = await supabase
            .from('Tasks')
            .insert({ FK_userStoryId: ACCEPT_STORY_ID, description: 'Finished task for accept', timecomplexity: 1, finished: true })
            .select().single()
        acceptTaskIds.push(task.id)

        await expect(acceptTask(task.id)).rejects.toThrow('Cannot accept a finished task.')
    })

    it('throws if task is already accepted by another developer', async () => {
        const { data: task } = await supabase
            .from('Tasks')
            .insert({ FK_userStoryId: ACCEPT_STORY_ID, description: 'Already accepted task', timecomplexity: 2, FK_acceptedDeveloper: TEST_USER_ID })
            .select().single()
        acceptTaskIds.push(task.id)

        await expect(acceptTask(task.id)).rejects.toThrow('Task has already been accepted by another developer.')
    })

    it('throws if task was proposed to a different developer', async () => {
        // Temporarily change the user's role to Scrum Master so we can insert with a different FK_proposedDeveloper
        // We need a valid user ID that is not TEST_USER_ID — use a known system user or insert directly
        // Here we insert a task proposed to TEST_USER_ID, sign out, and test with another user.
        // Since we only have one test user, we verify the check works by inserting with a fake proposedDeveloper
        // via a direct DB insert (bypassing FK if RLS is off, or using a real second user's ID from Users table).
        const { data: otherUser } = await supabase
            .from('Users')
            .select('id')
            .neq('id', TEST_USER_ID)
            .limit(1)
            .single()

        if (!otherUser) {
            console.warn('Skipping: no other user found in Users table for proposed-developer test.')
            return
        }

        const { data: task } = await supabase
            .from('Tasks')
            .insert({ FK_userStoryId: ACCEPT_STORY_ID, description: 'Proposed to other dev', timecomplexity: 2, FK_proposedDeveloper: otherUser.id })
            .select().single()
        acceptTaskIds.push(task.id)

        await expect(acceptTask(task.id)).rejects.toThrow('This task was proposed to a different developer.')
    })

    it('throws if user is not a Developer', async () => {
        await supabase.from('ProjectUsers')
            .update({ FK_projectRoleId: smRoleId })
            .eq('FK_projectId', ACCEPT_PROJECT_ID)
            .eq('FK_userId', TEST_USER_ID)

        const { data: task } = await supabase
            .from('Tasks')
            .insert({ FK_userStoryId: ACCEPT_STORY_ID, description: 'Task for SM accept attempt', timecomplexity: 2 })
            .select().single()
        acceptTaskIds.push(task.id)

        await expect(acceptTask(task.id)).rejects.toThrow('Only Developers can accept tasks.')

        await supabase.from('ProjectUsers')
            .update({ FK_projectRoleId: devRoleId })
            .eq('FK_projectId', ACCEPT_PROJECT_ID)
            .eq('FK_userId', TEST_USER_ID)
    })

    it('accepts an unassigned task with no proposed developer', async () => {
        const { data: task } = await supabase
            .from('Tasks')
            .insert({ FK_userStoryId: ACCEPT_STORY_ID, description: 'Task to accept freely', timecomplexity: 3 })
            .select().single()
        acceptTaskIds.push(task.id)

        const result = await acceptTask(task.id)
        expect(result.FK_acceptedDeveloper).toBe(TEST_USER_ID)
        expect(result.id).toBe(task.id)
    })

    it('accepts a task proposed to the current developer', async () => {
        const { data: task } = await supabase
            .from('Tasks')
            .insert({ FK_userStoryId: ACCEPT_STORY_ID, description: 'Task proposed to me', timecomplexity: 2, FK_proposedDeveloper: TEST_USER_ID })
            .select().single()
        acceptTaskIds.push(task.id)

        const result = await acceptTask(task.id)
        expect(result.FK_acceptedDeveloper).toBe(TEST_USER_ID)
    })
})

// ---

describe('finishTask', () => {
    let FINISH_PROJECT_ID
    let FINISH_STORY_ID
    const finishTaskIds = []
    const finishTimetableIds = []

    beforeAll(async () => {
        const { data: project } = await supabase
            .from('Projects')
            .insert({ name: `FinishTask Project ${Date.now()}`, description: 'temp' })
            .select().single()
        FINISH_PROJECT_ID = project.id

        const { data: roles } = await supabase.from('ProjectRoles').select('id, projectRole')
        const devRole = roles?.find(r => r.projectRole === 'Developer')
        if (!devRole) throw new Error('beforeAll: Developer role not found')

        await supabase.from('ProjectUsers').insert({
            FK_projectId: FINISH_PROJECT_ID,
            FK_userId: TEST_USER_ID,
            FK_projectRoleId: devRole.id,
        })

        const { data: priorities } = await supabase.from('Priorities').select('id').limit(1)

        const { data: story } = await supabase
            .from('UserStories')
            .insert({ name: `Finish Story ${Date.now()}`, FK_projectId: FINISH_PROJECT_ID, FK_priorityId: priorities[0].id, businessValue: 3 })
            .select().single()
        FINISH_STORY_ID = story.id

        const { data: sprint } = await supabase
            .from('Sprints')
            .insert({
                FK_projectId: FINISH_PROJECT_ID,
                startingDate: new Date(Date.now() - 86400000).toISOString(),
                endingDate: new Date(Date.now() + 86400000 * 14).toISOString(),
                startingSpeed: 20,
            })
            .select().single()

        await supabase.from('SprintUserStories').insert({ FK_sprintId: sprint.id, FK_userStoryId: FINISH_STORY_ID })
    })

    afterAll(async () => {
        if (finishTimetableIds.length > 0) {
            await supabase.from('TimeTables').delete().in('id', finishTimetableIds)
        }
        if (finishTaskIds.length > 0) {
            await supabase.from('Tasks').delete().in('id', finishTaskIds)
        }
        if (FINISH_STORY_ID) {
            const { data: sprint } = await supabase
                .from('SprintUserStories')
                .select('FK_sprintId')
                .eq('FK_userStoryId', FINISH_STORY_ID)
                .maybeSingle()
            if (sprint) {
                await supabase.from('SprintUserStories').delete().eq('FK_sprintId', sprint.FK_sprintId)
                await supabase.from('Sprints').delete().eq('id', sprint.FK_sprintId)
            }
            await supabase.from('UserStories').delete().eq('id', FINISH_STORY_ID)
        }
        if (FINISH_PROJECT_ID) {
            await supabase.from('ProjectUsers').delete().eq('FK_projectId', FINISH_PROJECT_ID)
            await supabase.from('Projects').delete().eq('id', FINISH_PROJECT_ID)
        }
    })

    it('throws if not authenticated', async () => {
        await supabase.auth.signOut()
        await expect(finishTask(999999)).rejects.toThrow('Not authenticated.')
        await signIn(TEST_USERNAME, TEST_PASSWORD)
    })

    it('throws if task does not exist', async () => {
        await expect(finishTask(999999)).rejects.toThrow('Task not found.')
    })

    it('throws if task is already finished', async () => {
        const { data: task } = await supabase
            .from('Tasks')
            .insert({ FK_userStoryId: FINISH_STORY_ID, description: 'Already finished task', timecomplexity: 1, finished: true, FK_acceptedDeveloper: TEST_USER_ID })
            .select().single()
        finishTaskIds.push(task.id)

        await expect(finishTask(task.id)).rejects.toThrow('Task is already finished.')
    })

    it('throws if the current user did not accept the task (starred)', async () => {
        const { data: task } = await supabase
            .from('Tasks')
            .insert({ FK_userStoryId: FINISH_STORY_ID, description: 'Not my task', timecomplexity: 2 })
            .select().single()
        finishTaskIds.push(task.id)

        await expect(finishTask(task.id)).rejects.toThrow('You can only finish a task you have accepted.')
    })

    it('marks an accepted task as finished', async () => {
        const { data: task } = await supabase
            .from('Tasks')
            .insert({ FK_userStoryId: FINISH_STORY_ID, description: 'Task to finish', timecomplexity: 3, FK_acceptedDeveloper: TEST_USER_ID })
            .select().single()
        finishTaskIds.push(task.id)

        const result = await finishTask(task.id)
        expect(result.finished).toBe(true)
        expect(result.id).toBe(task.id)
    })

    it('closes an open timetable entry when finishing a task', async () => {
        const { data: task } = await supabase
            .from('Tasks')
            .insert({ FK_userStoryId: FINISH_STORY_ID, description: 'Active task to finish', timecomplexity: 2, FK_acceptedDeveloper: TEST_USER_ID })
            .select().single()
        finishTaskIds.push(task.id)

        const { data: tt } = await supabase
            .from('TimeTables')
            .insert({ FK_taskId: task.id, FK_userId: TEST_USER_ID, starttime: new Date().toISOString(), stoptime: null })
            .select().single()
        finishTimetableIds.push(tt.id)

        await finishTask(task.id)

        const { data: closedTt } = await supabase
            .from('TimeTables')
            .select('stoptime')
            .eq('id', tt.id)
            .single()

        expect(closedTt.stoptime).not.toBeNull()
    })
})
