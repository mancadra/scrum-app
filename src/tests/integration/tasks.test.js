import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from '../../services/auth'
import { createTask } from '../../services/tasks'
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

    it('throws if time complexity is not a positive integer', async () => {
        await expect(
            createTask(TEST_STORY_ID, { description: 'Some task', timecomplexity: -1 })
        ).rejects.toThrow('Time complexity must be a positive integer.')
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
