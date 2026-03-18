import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from '../../services/auth'
import { getPriorities, createUserStory, setTimeComplexity, getStoriesForProject } from '../../services/stories'
import { supabase } from '../../config/supabase'

const TEST_USERNAME = 'testuser01'
const TEST_PASSWORD = 'testpassword123!'

let TEST_PROJECT_ID
let TEST_USER_ID
let TEST_SM_PROJECT_ID
const createdStoryIds = []

beforeAll(async () => {
    await signIn(TEST_USERNAME, TEST_PASSWORD)

    const { data: { session } } = await supabase.auth.getSession()
    TEST_USER_ID = session?.user?.id

    const { data: existingPriorities } = await supabase.from('Priorities').select('id').limit(1)
    if (!existingPriorities || existingPriorities.length === 0) {
        throw new Error('Priorities table is empty. Seed it via Supabase SQL before running integration tests.')
    }

    // Create a temporary test project
    const { data: project, error: projectError } = await supabase
        .from('Projects')
        .insert({ name: `Stories Test Project ${Date.now()}`, description: 'temp integration test project' })
        .select()
        .single()

    if (projectError) throw new Error(`beforeAll: could not create project: ${projectError.message}`)
    TEST_PROJECT_ID = project.id

    // Get the Product Owner role id
    const { data: roles } = await supabase
        .from('ProjectRoles')
        .select('id, projectRole')

    const poRole = roles?.find(r => r.projectRole === 'Product Owner')
    if (!poRole) throw new Error('beforeAll: Product Owner role not found in ProjectRoles')

    // Add testuser01 as Product Owner of the test project
    const { error: memberError } = await supabase
        .from('ProjectUsers')
        .insert({ FK_projectId: TEST_PROJECT_ID, FK_userId: TEST_USER_ID, FK_projectRoleId: poRole.id })

    if (memberError) throw new Error(`beforeAll: could not add member: ${memberError.message}`)

    // Create a separate project where testuser01 is a Scrum Master (for #11 tests)
    const { data: smProject, error: smProjectError } = await supabase
        .from('Projects')
        .insert({ name: `Stories SM Test Project ${Date.now()}`, description: 'temp sm project' })
        .select()
        .single()

    if (smProjectError) throw new Error(`beforeAll: could not create SM project: ${smProjectError.message}`)
    TEST_SM_PROJECT_ID = smProject.id

    const smRole = roles?.find(r => r.projectRole === 'Scrum Master')
    if (!smRole) throw new Error('beforeAll: Scrum Master role not found in ProjectRoles')

    const { error: smMemberError } = await supabase
        .from('ProjectUsers')
        .insert({ FK_projectId: TEST_SM_PROJECT_ID, FK_userId: TEST_USER_ID, FK_projectRoleId: smRole.id })

    if (smMemberError) throw new Error(`beforeAll: could not add SM member: ${smMemberError.message}`)
})

afterAll(async () => {
    if (createdStoryIds.length > 0) {
        await supabase.from('AcceptanceTests').delete().in('FK_userStoryId', createdStoryIds)
        await supabase.from('UserStories').delete().in('id', createdStoryIds)
    }
    if (TEST_PROJECT_ID) {
        await supabase.from('ProjectUsers').delete().eq('FK_projectId', TEST_PROJECT_ID)
        await supabase.from('Projects').delete().eq('id', TEST_PROJECT_ID)
    }
    if (TEST_SM_PROJECT_ID) {
        await supabase.from('ProjectUsers').delete().eq('FK_projectId', TEST_SM_PROJECT_ID)
        await supabase.from('Projects').delete().eq('id', TEST_SM_PROJECT_ID)
    }
})

// ---

describe('getPriorities', () => {
    it('returns a non-empty list of priorities', async () => {
        const priorities = await getPriorities()
        expect(Array.isArray(priorities)).toBe(true)
        expect(priorities.length).toBeGreaterThan(0)
        expect(priorities[0]).toHaveProperty('id')
        expect(priorities[0]).toHaveProperty('priority')
    })
})

// ---

describe('createUserStory', () => {
    it('throws if not authenticated', async () => {
        await supabase.auth.signOut()
        await expect(
            createUserStory(TEST_PROJECT_ID, {
                name: 'Should fail',
                description: '',
                acceptanceTests: [],
                priorityId: 1,
                businessValue: 1,
            })
        ).rejects.toThrow('Not authenticated.')
        await signIn(TEST_USERNAME, TEST_PASSWORD)
    })

    it('throws if user is not a member of the project', async () => {
        await expect(
            createUserStory(999999, {
                name: 'Should fail',
                description: '',
                acceptanceTests: [],
                priorityId: 1,
                businessValue: 1,
            })
        ).rejects.toThrow('You are not a member of this project.')
    })

    it('throws if business value is not a non-negative integer', async () => {
        await expect(
            createUserStory(TEST_PROJECT_ID, {
                name: 'Bad business value',
                description: '',
                acceptanceTests: [],
                priorityId: 1,
                businessValue: -1,
            })
        ).rejects.toThrow('Business value must be a non-negative integer.')
    })

    it('throws if priority is missing', async () => {
        await expect(
            createUserStory(TEST_PROJECT_ID, {
                name: 'No priority',
                description: '',
                acceptanceTests: [],
                priorityId: null,
                businessValue: 5,
            })
        ).rejects.toThrow('Priority is required.')
    })

    it('creates a user story with no acceptance tests', async () => {
        const priorities = await getPriorities()
        const priorityId = priorities[0].id
        const storyName = `Integration Story ${Date.now()}`

        const story = await createUserStory(TEST_PROJECT_ID, {
            name: storyName,
            description: 'Created by integration test',
            acceptanceTests: [],
            priorityId,
            businessValue: 3,
        })

        createdStoryIds.push(story.id)

        expect(story).toBeDefined()
        expect(story.id).toBeDefined()
        expect(story.name).toBe(storyName)
    })

    it('creates a user story with acceptance tests', async () => {
        const priorities = await getPriorities()
        const priorityId = priorities[0].id
        const storyName = `Integration Story With Tests ${Date.now()}`

        const story = await createUserStory(TEST_PROJECT_ID, {
            name: storyName,
            description: 'Story with acceptance tests',
            acceptanceTests: ['Test criterion one', 'Test criterion two'],
            priorityId,
            businessValue: 8,
        })

        createdStoryIds.push(story.id)

        const { data: tests } = await supabase
            .from('AcceptanceTests')
            .select('description')
            .eq('FK_userStoryId', story.id)

        expect(tests).toHaveLength(2)
        expect(tests.map(t => t.description)).toContain('Test criterion one')
        expect(tests.map(t => t.description)).toContain('Test criterion two')
    })

    it('throws if a duplicate story name is created in the same project', async () => {
        const priorities = await getPriorities()
        const priorityId = priorities[0].id
        const storyName = `Duplicate Story ${Date.now()}`

        const story = await createUserStory(TEST_PROJECT_ID, {
            name: storyName,
            description: 'First',
            acceptanceTests: [],
            priorityId,
            businessValue: 1,
        })
        createdStoryIds.push(story.id)

        await expect(
            createUserStory(TEST_PROJECT_ID, {
                name: storyName,
                description: 'Second duplicate',
                acceptanceTests: [],
                priorityId,
                businessValue: 2,
            })
        ).rejects.toThrow('A user story with this name already exists in this project.')
    })
})

// ---

describe('getStoriesForProject', () => {
    it('returns stories for the project with category annotations', async () => {
        const priorities = await getPriorities()
        const storyName = `Backlog Story ${Date.now()}`

        const story = await createUserStory(TEST_PROJECT_ID, {
            name: storyName,
            description: '',
            acceptanceTests: [],
            priorityId: priorities[0].id,
            businessValue: 5,
        })
        createdStoryIds.push(story.id)

        const stories = await getStoriesForProject(TEST_PROJECT_ID)

        expect(Array.isArray(stories)).toBe(true)
        const found = stories.find(s => s.id === story.id)
        expect(found).toBeDefined()
        expect(found.category).toBe('unassigned')
        expect(found.priority).toBe(priorities[0].priority)
    })

    it('returns empty array for a project with no stories', async () => {
        const { data: project } = await supabase
            .from('Projects')
            .insert({ name: `Empty Stories Project ${Date.now()}` })
            .select()
            .single()

        const stories = await getStoriesForProject(project.id)
        expect(stories).toHaveLength(0)

        await supabase.from('Projects').delete().eq('id', project.id)
    })
})

describe('setTimeComplexity', () => {
    let storyId

    beforeAll(async () => {
        const priorities = await getPriorities()
        const { data: story, error } = await supabase
            .from('UserStories')
            .insert({
                name: `TC Story ${Date.now()}`,
                FK_projectId: TEST_SM_PROJECT_ID,
                FK_priorityId: priorities[0].id,
                businessValue: 3,
            })
            .select()
            .single()

        if (error) throw new Error(`setTimeComplexity beforeAll: could not create story: ${error.message}`)
        storyId = story.id
    })

    afterAll(async () => {
        if (storyId) {
            await supabase.from('UserStories').delete().eq('id', storyId)
        }
    })

    it('throws if not authenticated', async () => {
        await supabase.auth.signOut()
        await expect(setTimeComplexity(storyId, 5)).rejects.toThrow('Not authenticated.')
        await signIn(TEST_USERNAME, TEST_PASSWORD)
    })

    it('throws if time complexity is not a positive number', async () => {
        await expect(setTimeComplexity(storyId, 0)).rejects.toThrow('Time complexity must be a positive number.')
        await expect(setTimeComplexity(storyId, -1)).rejects.toThrow('Time complexity must be a positive number.')
        await expect(setTimeComplexity(storyId, NaN)).rejects.toThrow('Time complexity must be a positive number.')
    })

    it('sets time complexity with a float value', async () => {
        const result = await setTimeComplexity(storyId, 2.5)
        expect(result.timeComplexity).toBe(2.5)
    })

    it('throws if story is not found', async () => {
        await expect(setTimeComplexity(999999, 5)).rejects.toThrow('User story not found.')
    })

    it('throws if user is not a Scrum Master (user is Product Owner on TEST_PROJECT_ID)', async () => {
        const priorities = await getPriorities()
        const { data: poStory } = await supabase
            .from('UserStories')
            .insert({
                name: `TC PO Story ${Date.now()}`,
                FK_projectId: TEST_PROJECT_ID,
                FK_priorityId: priorities[0].id,
                businessValue: 1,
            })
            .select()
            .single()

        createdStoryIds.push(poStory.id)

        await expect(setTimeComplexity(poStory.id, 5)).rejects.toThrow('Only Scrum Masters can set time complexity.')
    })

    it('sets time complexity on an unassigned story', async () => {
        const result = await setTimeComplexity(storyId, 8)
        expect(result.timeComplexity).toBe(8)
    })

    it('updates time complexity when called again', async () => {
        const result = await setTimeComplexity(storyId, 13)
        expect(result.timeComplexity).toBe(13)
    })

    it('throws if story is already assigned to a sprint', async () => {
        const priorities = await getPriorities()

        const { data: assignedStory } = await supabase
            .from('UserStories')
            .insert({
                name: `TC Assigned Story ${Date.now()}`,
                FK_projectId: TEST_SM_PROJECT_ID,
                FK_priorityId: priorities[0].id,
                businessValue: 2,
                timeComplexity: 5,
            })
            .select()
            .single()

        const { data: sprint } = await supabase
            .from('Sprints')
            .insert({
                FK_projectId: TEST_SM_PROJECT_ID,
                startingDate: new Date(Date.now() + 86400000).toISOString(),
                endingDate: new Date(Date.now() + 86400000 * 7).toISOString(),
                startingSpeed: 20,
            })
            .select()
            .single()

        await supabase
            .from('SprintUserStories')
            .insert({ FK_sprintId: sprint.id, FK_userStoryId: assignedStory.id })

        try {
            await expect(setTimeComplexity(assignedStory.id, 3)).rejects.toThrow(
                'Cannot set time complexity on a story that is already assigned to a sprint.'
            )
        } finally {
            await supabase.from('SprintUserStories').delete().eq('FK_userStoryId', assignedStory.id)
            await supabase.from('Sprints').delete().eq('id', sprint.id)
            await supabase.from('UserStories').delete().eq('id', assignedStory.id)
        }
    })
})
