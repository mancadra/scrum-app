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

function mockMemberEq(roles = [{ ProjectRoles: { projectRole: 'Scrum Master' } }], error = null) {
    const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn(),
    }
    chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ data: roles, error })
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
      .mockReturnValueOnce(mockMemberEq([{ ProjectRoles: { projectRole: 'Scrum Master' } }]))
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

    mockFrom.mockReturnValueOnce(mockMemberEq([{ ProjectRoles: { projectRole: 'Scrum Master' } }]))

    const payload = {
      ...validPayload,
      startingDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      endingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    }

    await expect(createSprint(projectId, payload))
      .rejects.toThrow('Končni datum mora biti po začetnem datumu.')
  })

  test('throws when starting date is in the past', async () => {
    mockAuthAs(scrumMasterUserId)

    mockFrom.mockReturnValueOnce(mockMemberEq([{ ProjectRoles: { projectRole: 'Scrum Master' } }]))

    const payload = {
      ...validPayload,
      startingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }

    await expect(createSprint(projectId, payload))
      .rejects.toThrow('Začetni datum mora biti v prihodnosti.')
  })

  test('throws when startingSpeed is not a positive integer', async () => {
    mockAuthAs(scrumMasterUserId)

    mockFrom.mockReturnValueOnce(mockMemberEq([{ ProjectRoles: { projectRole: 'Scrum Master' } }]))

    await expect(createSprint(projectId, { ...validPayload, startingSpeed: -5 }))
      .rejects.toThrow('Začetna hitrost mora biti pozitivno celo število.')
  })

  test('throws when sprint overlaps with an existing sprint', async () => {
    mockAuthAs(scrumMasterUserId)

    mockFrom
      .mockReturnValueOnce(mockMemberEq([{ ProjectRoles: { projectRole: 'Scrum Master' } }]))
      .mockReturnValueOnce(mockQuery({
        data: [{
          id: 'existing-sprint-uuid',
          startingDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          endingDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        }],
        error: null,
      }))

    await expect(createSprint(projectId, validPayload))
      .rejects.toThrow('Datumi sprinta se prekrivajo z obstoječim sprintom v tem projektu.')
  })

  test('throws when user is not a Scrum Master', async () => {
    mockAuthAs('developer-uuid')

    mockFrom.mockReturnValueOnce(mockMemberEq([{ ProjectRoles: { projectRole: 'Developer' } }]))

    await expect(createSprint(projectId, validPayload))
      .rejects.toThrow('Samo skrbniki metodologije lahko ustvarjajo sprinte.')
  })

  test('throws when user is not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    await expect(createSprint(projectId, validPayload))
      .rejects.toThrow('Niste prijavljeni.')
  })

})