import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMyTimeEntries, updateTimeEntry, setRemainingHours } from '../../services/timetables'
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

function mockSession(userId = USER_ID) {
    supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: userId } } },
        error: null,
    })
}

function mockNoSession() {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
}

// Builds a chainable query mock whose last method resolves with `result`.
function mockChain(terminator, result) {
    const chain = {
        select:    vi.fn().mockReturnThis(),
        eq:        vi.fn().mockReturnThis(),
        not:       vi.fn().mockReturnThis(),
        is:        vi.fn().mockReturnThis(),
        gte:       vi.fn().mockReturnThis(),
        lte:       vi.fn().mockReturnThis(),
        order:     vi.fn().mockReturnThis(),
        update:    vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        single:    vi.fn().mockReturnThis(),
    }
    chain[terminator] = vi.fn().mockResolvedValue(result)
    return chain
}

// ─── getMyTimeEntries ────────────────────────────────────────────────────────

describe('getMyTimeEntries()', () => {
    it('throws when not logged in', async () => {
        mockNoSession()
        await expect(getMyTimeEntries()).rejects.toThrow('Niste prijavljeni.')
    })

    it('returns mapped entries with computed hours', async () => {
        mockSession()
        const starttime = '2026-04-06T08:00:00.000Z'
        const stoptime  = '2026-04-06T10:00:00.000Z' // 2 hours
        const raw = [{
            id: 1, starttime, stoptime,
            Tasks: { id: 10, description: 'Fix bug', remaininghours: 3,
                UserStories: { id: 5, name: 'Login story' } },
        }]
        supabase.from.mockReturnValueOnce(mockChain('order', { data: raw, error: null }))

        const result = await getMyTimeEntries()

        expect(result).toHaveLength(1)
        expect(result[0].hours).toBeCloseTo(2)
        expect(result[0].taskDescription).toBe('Fix bug')
        expect(result[0].storyName).toBe('Login story')
        expect(result[0].remaininghours).toBe(3)
    })

    it('returns empty array when no entries', async () => {
        mockSession()
        supabase.from.mockReturnValueOnce(mockChain('order', { data: null, error: null }))

        const result = await getMyTimeEntries()
        expect(result).toEqual([])
    })

    it('throws on query error', async () => {
        mockSession()
        supabase.from.mockReturnValueOnce(mockChain('order', { data: null, error: { message: 'DB error' } }))

        await expect(getMyTimeEntries()).rejects.toThrow('DB error')
    })

    it('filters by a single day when from and to are the same', async () => {
        mockSession()
        supabase.from.mockReturnValueOnce(mockChain('order', { data: [], error: null }))

        await getMyTimeEntries({ from: '2026-04-06', to: '2026-04-06' })

        const chain = supabase.from.mock.results[0].value
        expect(chain.gte).toHaveBeenCalledWith('starttime', expect.stringContaining('2026-04-06'))
        expect(chain.lte).toHaveBeenCalledWith('starttime', expect.stringContaining('2026-04-06'))
    })

    it('applies only lower bound when only from is provided', async () => {
        mockSession()
        supabase.from.mockReturnValueOnce(mockChain('order', { data: [], error: null }))

        await getMyTimeEntries({ from: '2026-03-31' })

        const chain = supabase.from.mock.results[0].value
        expect(chain.gte).toHaveBeenCalled()
        expect(chain.lte).not.toHaveBeenCalled()
    })

    it('filters a full week range', async () => {
        mockSession()
        supabase.from.mockReturnValueOnce(mockChain('order', { data: [], error: null }))

        await getMyTimeEntries({ from: '2026-03-31', to: '2026-04-06' })

        const chain = supabase.from.mock.results[0].value
        expect(chain.gte).toHaveBeenCalledWith('starttime', expect.stringContaining('2026-03-31'))
        expect(chain.lte).toHaveBeenCalledWith('starttime', expect.stringContaining('2026-04-06'))
    })
})

// ─── updateTimeEntry ─────────────────────────────────────────────────────────

describe('updateTimeEntry()', () => {
    const entry = {
        id: 1,
        FK_userId: USER_ID,
        starttime: '2026-04-06T08:00:00.000Z',
        stoptime:  '2026-04-06T09:00:00.000Z',
    }

    it('throws when hours is 0', async () => {
        await expect(updateTimeEntry(1, 0)).rejects.toThrow('Število ur mora biti med 0 in 24.')
    })

    it('throws when hours exceeds 24', async () => {
        await expect(updateTimeEntry(1, 25)).rejects.toThrow('Število ur mora biti med 0 in 24.')
    })

    it('throws when hours is negative', async () => {
        await expect(updateTimeEntry(1, -1)).rejects.toThrow('Število ur mora biti med 0 in 24.')
    })

    it('throws when not logged in', async () => {
        mockNoSession()
        await expect(updateTimeEntry(1, 2)).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws when entry not found', async () => {
        mockSession()
        supabase.from.mockReturnValueOnce(mockChain('maybeSingle', { data: null, error: null }))

        await expect(updateTimeEntry(1, 2)).rejects.toThrow('Vnos ni bil najden.')
    })

    it('throws when entry belongs to another user', async () => {
        mockSession()
        supabase.from.mockReturnValueOnce(
            mockChain('maybeSingle', { data: { ...entry, FK_userId: 'other-uuid' }, error: null })
        )

        await expect(updateTimeEntry(1, 2)).rejects.toThrow('Nimate dovoljenja za urejanje tega vnosa.')
    })

    it('throws when entry has no stoptime (timer still running)', async () => {
        mockSession()
        supabase.from.mockReturnValueOnce(
            mockChain('maybeSingle', { data: { ...entry, stoptime: null }, error: null })
        )

        await expect(updateTimeEntry(1, 2)).rejects.toThrow('Aktivnega časovnika ni mogoče urejati.')
    })

    it('updates stoptime to starttime + hours', async () => {
        mockSession()
        supabase.from
            .mockReturnValueOnce(mockChain('maybeSingle', { data: entry, error: null }))
            .mockReturnValueOnce(mockChain('single', { data: { ...entry, stoptime: '2026-04-06T10:00:00.000Z' }, error: null }))

        const result = await updateTimeEntry(1, 2)

        expect(result.stoptime).toBe('2026-04-06T10:00:00.000Z')
    })
})

// ─── setRemainingHours ───────────────────────────────────────────────────────

describe('setRemainingHours()', () => {
    const task = { id: 10, FK_acceptedDeveloper: USER_ID }

    it('throws when hours is negative', async () => {
        await expect(setRemainingHours(10, -1)).rejects.toThrow('Preostale ure morajo biti 0 ali več.')
    })

    it('allows setting hours to 0 (task done)', async () => {
        mockSession()
        supabase.from
            .mockReturnValueOnce(mockChain('maybeSingle', { data: task, error: null }))
            .mockReturnValueOnce(mockChain('single', { data: { ...task, remaininghours: 0 }, error: null }))

        const result = await setRemainingHours(10, 0)
        expect(result.remaininghours).toBe(0)
    })

    it('throws when not logged in', async () => {
        mockNoSession()
        await expect(setRemainingHours(10, 3)).rejects.toThrow('Niste prijavljeni.')
    })

    it('throws when task not found', async () => {
        mockSession()
        supabase.from.mockReturnValueOnce(mockChain('maybeSingle', { data: null, error: null }))

        await expect(setRemainingHours(10, 3)).rejects.toThrow('Naloga ni bila najdena.')
    })

    it('throws when current user did not accept the task', async () => {
        mockSession()
        supabase.from.mockReturnValueOnce(
            mockChain('maybeSingle', { data: { ...task, FK_acceptedDeveloper: 'other-uuid' }, error: null })
        )

        await expect(setRemainingHours(10, 3)).rejects.toThrow('Preostale ure lahko ureja samo razvijalec, ki je nalogo sprejel.')
    })

    it('updates remaininghours successfully', async () => {
        mockSession()
        supabase.from
            .mockReturnValueOnce(mockChain('maybeSingle', { data: task, error: null }))
            .mockReturnValueOnce(mockChain('single', { data: { ...task, remaininghours: 5 }, error: null }))

        const result = await setRemainingHours(10, 5)
        expect(result.remaininghours).toBe(5)
    })
})
