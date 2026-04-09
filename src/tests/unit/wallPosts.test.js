import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWallPosts, createWallPost } from '../../services/wallPosts'
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

const USER_ID = 'user-uuid'
const PROJECT_ID = 1

function mockSession(userId = USER_ID) {
    supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: userId } } },
        error: null,
    })
}

function mockNoSession() {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
}

// membership check → member
function mockMember() {
    const chain = {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { FK_userId: USER_ID }, error: null }),
    }
    supabase.from.mockReturnValueOnce(chain)
}

// membership check → not a member
function mockNotMember() {
    const chain = {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    supabase.from.mockReturnValueOnce(chain)
}

// ─── getWallPosts ─────────────────────────────────────────────────────────────

describe('getWallPosts()', () => {
    it('throws when not logged in', async () => {
        mockNoSession()
        await expect(getWallPosts(PROJECT_ID)).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws when user is not a project member', async () => {
        mockSession()
        mockNotMember()
        await expect(getWallPosts(PROJECT_ID)).rejects.toThrow('Niste član tega projekta.')
    })

    it('returns top-level posts ordered newest first', async () => {
        mockSession()
        mockMember()

        const posts = [
            { id: 2, content: 'Hello', created_at: '2026-04-06T10:00:00Z', responseTo: null, Users: { id: USER_ID, username: 'alice' } },
            { id: 1, content: 'First', created_at: '2026-04-05T09:00:00Z', responseTo: null, Users: { id: USER_ID, username: 'alice' } },
        ]
        const chain = {
            select: vi.fn().mockReturnThis(),
            eq:     vi.fn().mockReturnThis(),
            is:     vi.fn().mockReturnThis(),
            order:  vi.fn().mockResolvedValue({ data: posts, error: null }),
        }
        supabase.from.mockReturnValueOnce(chain)

        const result = await getWallPosts(PROJECT_ID)
        expect(result).toHaveLength(2)
        expect(result[0].id).toBe(2)
    })

    it('returns empty array when no posts', async () => {
        mockSession()
        mockMember()

        const chain = {
            select: vi.fn().mockReturnThis(),
            eq:     vi.fn().mockReturnThis(),
            is:     vi.fn().mockReturnThis(),
            order:  vi.fn().mockResolvedValue({ data: null, error: null }),
        }
        supabase.from.mockReturnValueOnce(chain)

        const result = await getWallPosts(PROJECT_ID)
        expect(result).toEqual([])
    })

    it('throws on query error', async () => {
        mockSession()
        mockMember()

        const chain = {
            select: vi.fn().mockReturnThis(),
            eq:     vi.fn().mockReturnThis(),
            is:     vi.fn().mockReturnThis(),
            order:  vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }
        supabase.from.mockReturnValueOnce(chain)

        await expect(getWallPosts(PROJECT_ID)).rejects.toThrow('DB error')
    })
})

// ─── createWallPost ───────────────────────────────────────────────────────────

describe('createWallPost()', () => {
    it('throws when content is empty', async () => {
        await expect(createWallPost(PROJECT_ID, '')).rejects.toThrow('Vsebina objave ne sme biti prazna.')
    })

    it('throws when content is only whitespace', async () => {
        await expect(createWallPost(PROJECT_ID, '   ')).rejects.toThrow('Vsebina objave ne sme biti prazna.')
    })

    it('throws when not logged in', async () => {
        mockNoSession()
        await expect(createWallPost(PROJECT_ID, 'Hello')).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws when user is not a project member', async () => {
        mockSession()
        mockNotMember()
        await expect(createWallPost(PROJECT_ID, 'Hello')).rejects.toThrow('Niste član tega projekta.')
    })

    it('creates a post and returns it', async () => {
        mockSession()
        mockMember()

        const newPost = { id: 3, content: 'Hello', created_at: '2026-04-06T11:00:00Z', responseTo: null,
            Users: { id: USER_ID, username: 'alice' } }
        const chain = {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: newPost, error: null }),
        }
        supabase.from.mockReturnValueOnce(chain)

        const result = await createWallPost(PROJECT_ID, 'Hello')
        expect(result.id).toBe(3)
        expect(result.content).toBe('Hello')
        expect(result.responseTo).toBeNull()
    })

    it('trims whitespace from content before inserting', async () => {
        mockSession()
        mockMember()

        const newPost = { id: 4, content: 'trimmed', created_at: '2026-04-06T11:00:00Z', responseTo: null,
            Users: { id: USER_ID, username: 'alice' } }
        const chain = {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: newPost, error: null }),
        }
        supabase.from.mockReturnValueOnce(chain)

        await createWallPost(PROJECT_ID, '  trimmed  ')
        expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ content: 'trimmed' }))
    })

    it('throws on insert error', async () => {
        mockSession()
        mockMember()

        const chain = {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
        }
        supabase.from.mockReturnValueOnce(chain)

        await expect(createWallPost(PROJECT_ID, 'Hello')).rejects.toThrow('insert failed')
    })
})
