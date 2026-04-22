import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn() },
  },
}))

import { supabase } from '../../config/supabase'
import { getDocumentation, saveDocumentation, importDocumentation, exportDocumentation } from '../../services/documentation.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => vi.clearAllMocks())

function mockChain(overrides) {
  const chain = {
    select:      vi.fn().mockReturnThis(),
    insert:      vi.fn().mockReturnThis(),
    update:      vi.fn().mockReturnThis(),
    delete:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
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

function mockMember() {
  const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
  c.eq
    .mockReturnValueOnce(c)
    .mockResolvedValueOnce({ data: [{ FK_projectRoleId: 1 }], error: null })
  supabase.from.mockReturnValueOnce(c)
}

function mockNotMember() {
  const c = { select: vi.fn().mockReturnThis(), eq: vi.fn() }
  c.eq
    .mockReturnValueOnce(c)
    .mockResolvedValueOnce({ data: [], error: null })
  supabase.from.mockReturnValueOnce(c)
}

const projectId = 'project-uuid'
const mockDoc = { id: 'doc-uuid', content: '# My Documentation\n\nSome content.' }

// ─── getDocumentation ─────────────────────────────────────────────────────────

describe('getDocumentation()', () => {

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    await expect(getDocumentation(projectId)).rejects.toThrow('Niste prijavljeni.')
  })

  it('throws if user is not a project member', async () => {
    mockAuth()
    mockNotMember()
    await expect(getDocumentation(projectId)).rejects.toThrow('Niste član tega projekta.')
  })

  it('returns documentation for a project member', async () => {
    mockAuth()
    mockMember()
    supabase.from.mockReturnValueOnce(mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: mockDoc, error: null }),
    }))

    const result = await getDocumentation(projectId)
    expect(result).toEqual(mockDoc)
  })

  it('returns null if no documentation exists yet', async () => {
    mockAuth()
    mockMember()
    supabase.from.mockReturnValueOnce(mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }))

    const result = await getDocumentation(projectId)
    expect(result).toBeNull()
  })

})

// ─── saveDocumentation ────────────────────────────────────────────────────────

describe('saveDocumentation()', () => {

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    await expect(saveDocumentation(projectId, '# Doc')).rejects.toThrow('Niste prijavljeni.')
  })

  it('throws if user is not a project member', async () => {
    mockAuth()
    mockNotMember()
    await expect(saveDocumentation(projectId, '# Doc')).rejects.toThrow('Niste član tega projekta.')
  })

  it('throws if content is not a string', async () => {
    mockAuth()
    mockMember()
    await expect(saveDocumentation(projectId, 123)).rejects.toThrow('Vsebina mora biti besedilo.')
  })

  it('inserts new documentation when none exists', async () => {
    const newDoc = { id: 'new-doc-uuid', content: '# New Doc' }
    mockAuth()
    mockMember()
    // Fetch existing → none found
    supabase.from.mockReturnValueOnce(mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }))
    // Insert
    supabase.from.mockReturnValueOnce(mockChain({
      single: vi.fn().mockResolvedValue({ data: newDoc, error: null }),
    }))

    const result = await saveDocumentation(projectId, '# New Doc')
    expect(result).toEqual(newDoc)
  })

  it('updates existing documentation when it already exists', async () => {
    const updated = { ...mockDoc, content: '# Updated' }
    mockAuth()
    mockMember()
    // Fetch existing → found
    supabase.from.mockReturnValueOnce(mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'doc-uuid' }, error: null }),
    }))
    // Update
    supabase.from.mockReturnValueOnce(mockChain({
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    }))

    const result = await saveDocumentation(projectId, '# Updated')
    expect(result).toEqual(updated)
  })

})

// ─── importDocumentation ──────────────────────────────────────────────────────

describe('importDocumentation()', () => {

  it('throws if content is empty', async () => {
    mockAuth()
    await expect(importDocumentation(projectId, '')).rejects.toThrow('Uvožena vsebina ne sme biti prazna.')
  })

  it('throws if content is only whitespace', async () => {
    mockAuth()
    await expect(importDocumentation(projectId, '   ')).rejects.toThrow('Uvožena vsebina ne sme biti prazna.')
  })

  it('throws if content is not a string', async () => {
    mockAuth()
    await expect(importDocumentation(projectId, null)).rejects.toThrow('Uvožena vsebina ne sme biti prazna.')
  })

  it('successfully imports and replaces documentation', async () => {
    const imported = { id: 'doc-uuid', content: '# Imported' }
    mockAuth()
    mockMember()
    supabase.from.mockReturnValueOnce(mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }))
    supabase.from.mockReturnValueOnce(mockChain({
      single: vi.fn().mockResolvedValue({ data: imported, error: null }),
    }))

    const result = await importDocumentation(projectId, '# Imported')
    expect(result).toEqual(imported)
  })

})

// ─── exportDocumentation ─────────────────────────────────────────────────────

describe('exportDocumentation()', () => {

  it('throws if not authenticated', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    await expect(exportDocumentation(projectId)).rejects.toThrow('Niste prijavljeni.')
  })

  it('throws if user is not a project member', async () => {
    mockAuth()
    mockNotMember()
    await expect(exportDocumentation(projectId)).rejects.toThrow('Niste član tega projekta.')
  })

  it('throws if no documentation exists to export', async () => {
    mockAuth()
    mockMember()
    supabase.from.mockReturnValueOnce(mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }))

    await expect(exportDocumentation(projectId)).rejects.toThrow('Ni dokumentacije za izvoz.')
  })

  it('throws if documentation content is empty', async () => {
    mockAuth()
    mockMember()
    supabase.from.mockReturnValueOnce(mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'doc-uuid', content: '' }, error: null }),
    }))

    await expect(exportDocumentation(projectId)).rejects.toThrow('Ni dokumentacije za izvoz.')
  })

  it('returns filename, content and mimeType', async () => {
    mockAuth()
    mockMember()
    supabase.from.mockReturnValueOnce(mockChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: mockDoc, error: null }),
    }))

    const result = await exportDocumentation(projectId)
    expect(result).toEqual({
      filename: `documentation-${projectId}.md`,
      content: mockDoc.content,
      mimeType: 'text/markdown',
    })
  })

})