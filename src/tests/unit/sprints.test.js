import { describe, test, expect, beforeEach, vi } from 'vitest'

const { mockFrom, mockGetSession } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSession: vi.fn(),
}))

vi.mock('../../config/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getSession: mockGetSession,
    },
  },
}))

import { createSprint } from '../../services/sprints.js'

function mockQuery(result) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn().mockResolvedValue(result),
    insert: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  return chain
}


const projectId = 'project-uuid-123'
const scrumMasterUserId = 'scrum-master-uuid'

const validPayload = {
  startingDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  endingDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(),
  startingSpeed: 40,
}

function mockAuthAs(userId) {
  mockGetSession.mockResolvedValueOnce({
    data: { session: { user: { id: userId } } },
    error: null,
  })
}


describe('createSprint()', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('successfully creates a sprint with valid data', async () => {
    mockAuthAs(scrumMasterUserId)

    mockFrom
      // ProjectUsers role check → Scrum Master
      .mockReturnValueOnce(mockQuery({
        data: { FK_projectRoleId: 1, ProjectRoles: { projectRole: 'Scrum Master' } },
        error: null,
      }))
      // Overlap check → no overlapping sprints
      .mockReturnValueOnce(mockQuery({ data: [], error: null }))
      // Insert sprint
      .mockReturnValueOnce(mockQuery({
        data: { id: 'new-sprint-uuid', FK_projectId: projectId, ...validPayload },
        error: null,
      }))

    const result = await createSprint(projectId, validPayload)
    expect(result).toMatchObject({ FK_projectId: projectId, startingSpeed: 40 })
  })

  test('throws when ending date is before starting date', async () => {
    mockAuthAs(scrumMasterUserId)

    mockFrom.mockReturnValueOnce(mockQuery({
      data: { FK_projectRoleId: 1, ProjectRoles: { projectRole: 'Scrum Master' } },
      error: null,
    }))

    const payload = {
      ...validPayload,
      startingDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      endingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    }

    await expect(createSprint(projectId, payload))
      .rejects.toThrow('Ending date must be after starting date.')
  })

  test('throws when starting date is in the past', async () => {
    mockAuthAs(scrumMasterUserId)

    mockFrom.mockReturnValueOnce(mockQuery({
      data: { FK_projectRoleId: 1, ProjectRoles: { projectRole: 'Scrum Master' } },
      error: null,
    }))

    const payload = {
      ...validPayload,
      startingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }

    await expect(createSprint(projectId, payload))
      .rejects.toThrow('Starting date must be in the future.')
  })

  test('throws when startingSpeed is not a positive integer', async () => {
    mockAuthAs(scrumMasterUserId)

    mockFrom.mockReturnValueOnce(mockQuery({
      data: { FK_projectRoleId: 1, ProjectRoles: { projectRole: 'Scrum Master' } },
      error: null,
    }))

    await expect(createSprint(projectId, { ...validPayload, startingSpeed: -5 }))
      .rejects.toThrow('Starting speed must be a positive integer.')
  })

  test('throws when sprint overlaps with an existing sprint', async () => {
    mockAuthAs(scrumMasterUserId)

    mockFrom
      .mockReturnValueOnce(mockQuery({
        data: { FK_projectRoleId: 1, ProjectRoles: { projectRole: 'Scrum Master' } },
        error: null,
      }))
      .mockReturnValueOnce(mockQuery({
        data: [{
          id: 'existing-sprint-uuid',
          startingDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          endingDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        }],
        error: null,
      }))

    await expect(createSprint(projectId, validPayload))
      .rejects.toThrow('Sprint dates overlap with an existing sprint in this project.')
  })

  test('throws when user is not a Scrum Master', async () => {
    mockAuthAs('developer-uuid')

    mockFrom.mockReturnValueOnce(mockQuery({
      data: { FK_projectRoleId: 2, ProjectRoles: { projectRole: 'Developer' } },
      error: null,
    }))

    await expect(createSprint(projectId, validPayload))
      .rejects.toThrow('Only Scrum Masters can create sprints.')
  })

  test('throws when user is not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    await expect(createSprint(projectId, validPayload))
      .rejects.toThrow('Not authenticated.')
  })

})