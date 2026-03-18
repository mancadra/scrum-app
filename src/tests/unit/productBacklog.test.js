import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn() },
  },
}))

import { supabase } from '../../config/supabase'
import { getRealizedStories, getAssignedStories, getUnassignedStories } from '../../services/productBacklog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    not:         vi.fn().mockReturnThis(),
    lte:         vi.fn().mockReturnThis(),
    gte:         vi.fn().mockReturnThis(),
    single:      vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    ...overrides,
  }
  return chain
}

function mockAuth(userId = 'user-uuid') {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: userId } } },
  })
}

// membership check ends with .maybeSingle()
function mockMember() {
  return mockChain({
    maybeSingle: vi.fn().mockResolvedValue({
      data: { FK_projectRoleId: 1 },
      error: null,
    }),
  })
}

function mockNotMember() {
  return mockChain({
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  })
}

// sprint query ends with .gte()
function mockSprintQuery(sprints) {
  return mockChain({
    gte: vi.fn().mockResolvedValue({ data: sprints, error: null }),
  })
}

// SprintUserStories query ends with .in()
function mockSprintLinks(links) {
  return mockChain({
    in: vi.fn().mockResolvedValue({ data: links, error: null }),
  })
}

// stories query — two .eq() calls, second one is terminal
function mockStoriesQuery(data) {
  let callCount = 0
  const chain = mockChain({
    eq: vi.fn().mockImplementation(() => {
      callCount++
      if (callCount >= 2) return Promise.resolve({ data, error: null })
      return chain
    }),
  })
  return chain
}

const projectId    = 'project-uuid-123'
const activeSprint = [{ id: 'sprint-uuid' }]

const realizedStory   = { id: 1, name: 'Story A', realized: true,  timeComplexity: 5 }
const assignedStory   = { id: 2, name: 'Story B', realized: false, timeComplexity: 3 }
const unassignedStory = { id: 3, name: 'Story C', realized: false, timeComplexity: 8 }

// ─── getRealizedStories ───────────────────────────────────────────────────────
// Query chain: .select().eq('FK_projectId').eq('realized') → resolves at last .eq()

describe('getRealizedStories()', () => {

    it('returns realized stories for a project member', async () => {
    mockAuth()
    supabase.from
        .mockReturnValueOnce(mockMember())
        .mockReturnValueOnce(mockStoriesQuery([realizedStory]))

    const result = await getRealizedStories(projectId)
    expect(result).toEqual([realizedStory])
    })

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    await expect(getRealizedStories(projectId)).rejects.toThrow('Not authenticated.')
  })

  it('throws if user is not a project member', async () => {
    mockAuth()
    supabase.from.mockReturnValueOnce(mockNotMember())

    await expect(getRealizedStories(projectId)).rejects.toThrow('You are not a member of this project.')
  })

})

// ─── getAssignedStories ───────────────────────────────────────────────────────

describe('getAssignedStories()', () => {

  it('returns stories assigned to an active sprint', async () => {
    mockAuth()
    supabase.from
      .mockReturnValueOnce(mockMember())
      .mockReturnValueOnce(mockSprintQuery(activeSprint))
      .mockReturnValueOnce(mockSprintLinks([{ FK_userStoryId: 2 }]))
      // final stories query ends with .in()
      .mockReturnValueOnce(mockChain({
        in: vi.fn().mockResolvedValue({ data: [assignedStory], error: null }),
      }))

    const result = await getAssignedStories(projectId)
    expect(result).toEqual([assignedStory])
  })

  it('returns empty array when there is no active sprint', async () => {
    mockAuth()
    supabase.from
      .mockReturnValueOnce(mockMember())
      .mockReturnValueOnce(mockSprintQuery([]))

    const result = await getAssignedStories(projectId)
    expect(result).toEqual([])
  })

  it('returns empty array when active sprint has no stories', async () => {
    mockAuth()
    supabase.from
      .mockReturnValueOnce(mockMember())
      .mockReturnValueOnce(mockSprintQuery(activeSprint))
      .mockReturnValueOnce(mockSprintLinks([]))

    const result = await getAssignedStories(projectId)
    expect(result).toEqual([])
  })

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    await expect(getAssignedStories(projectId)).rejects.toThrow('Not authenticated.')
  })

  it('throws if user is not a project member', async () => {
    mockAuth()
    supabase.from.mockReturnValueOnce(mockNotMember())

    await expect(getAssignedStories(projectId)).rejects.toThrow('You are not a member of this project.')
  })

})

// ─── getUnassignedStories ─────────────────────────────────────────────────────

describe('getUnassignedStories()', () => {

  it('returns unassigned unrealized stories when active sprint exists', async () => {
    mockAuth()
    supabase.from
      .mockReturnValueOnce(mockMember())
      .mockReturnValueOnce(mockSprintQuery(activeSprint))
      .mockReturnValueOnce(mockSprintLinks([{ FK_userStoryId: 2 }]))
      // final stories query ends with .not()
      .mockReturnValueOnce(mockChain({
        not: vi.fn().mockResolvedValue({ data: [unassignedStory], error: null }),
      }))

    const result = await getUnassignedStories(projectId)
    expect(result).toEqual([unassignedStory])
  })

    it('returns all unrealized stories when there is no active sprint', async () => {
    mockAuth()
    supabase.from
        .mockReturnValueOnce(mockMember())
        .mockReturnValueOnce(mockSprintQuery([]))
        .mockReturnValueOnce(mockStoriesQuery([unassignedStory]))

    const result = await getUnassignedStories(projectId)
    expect(result).toEqual([unassignedStory])
    })

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    await expect(getUnassignedStories(projectId)).rejects.toThrow('Not authenticated.')
  })

  it('throws if user is not a project member', async () => {
    mockAuth()
    supabase.from.mockReturnValueOnce(mockNotMember())

    await expect(getUnassignedStories(projectId)).rejects.toThrow('You are not a member of this project.')
  })

})