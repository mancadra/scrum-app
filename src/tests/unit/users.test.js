import { describe, test, expect, beforeEach, vi } from 'vitest'

const { mockFrom, mockCreateUser, mockDeleteUser, mockAnonFrom, mockGetUser, mockUpdateUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCreateUser: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockAnonFrom: vi.fn(),
  mockGetUser: vi.fn(),
  mockUpdateUser: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
      },
    },
  }),
}))

vi.mock('../../config/supabase', () => ({
  supabase: {
    from: mockAnonFrom,
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
  },
}))

import { createUser, updateOwnProfile } from '../../services/users.js'

function mockQuery(result) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn(),
    delete: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.ilike.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  return chain
}

const adminUserId = 'admin-uuid-123'
const newUserPayload = {
  username: 'jnovak',
  password: 'Str0ng!Passw0rd#99',
  email: 'j.novak@example.com',
  firstName: 'Jan',
  lastName: 'Novak',
  role: 'user',
}

describe('createUser()', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('successfully creates a new user with valid data', async () => {
    // Actual order in users.js:
    // 1. getRoleId('admin')    2. UserRoles isAdmin    3. validatePassword (no DB)
    // 4. getRoleId('user')     5. Users duplicate check
    // 6. auth.createUser       7. Users insert         8. UserRoles insert
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { FK_roleId: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-user-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: null, error: { code: 'PGRST116' } }))
      .mockReturnValueOnce(mockQuery({ data: { id: 'new-user-uuid', username: 'jnovak' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: {}, error: null }))

    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: 'new-user-uuid' } },
      error: null,
    })

    const result = await createUser(adminUserId, newUserPayload)
    expect(result).toMatchObject({ username: 'jnovak', role: 'user' })
    expect(mockCreateUser).toHaveBeenCalledTimes(1)
  })

  test('throws when username already exists', async () => {
    // 1. getRoleId('admin')  2. UserRoles isAdmin  3. getRoleId('user')  4. Users duplicate → EXISTS
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { FK_roleId: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-user-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { id: 'existing-uuid' }, error: null }))

    await expect(createUser(adminUserId, newUserPayload))
      .rejects.toThrow('Uporabniško ime "jnovak" je že zasedeno.')

    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  test('throws when requesting user is not an admin', async () => {
    // 1. getRoleId('admin')  2. UserRoles isAdmin → not found
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: null, error: { code: 'PGRST116' } }))

    await expect(createUser('non-admin-uuid', newUserPayload))
      .rejects.toThrow('Dostop zavrnjen. To dejanje je dovoljeno samo administratorjem.')

    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  test('throws when a required field is missing', async () => {
    // 1. getRoleId('admin')  2. UserRoles isAdmin → passes, then fields check fails
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { FK_roleId: 'role-admin-id' }, error: null }))

    const incomplete = { ...newUserPayload, firstName: '' }

    await expect(createUser(adminUserId, incomplete))
      .rejects.toThrow('Vsa polja so obvezna')
  })

    test('throws when password is too common', async () => {
    mockFrom
        .mockReturnValueOnce(mockQuery({ data: { id: 'role-admin-id' }, error: null }))    // getRoleId('admin')
        .mockReturnValueOnce(mockQuery({ data: { FK_roleId: 'role-admin-id' }, error: null })) // UserRoles isAdmin
        .mockReturnValueOnce(mockQuery({ data: { id: 'role-user-id' }, error: null }))     // ← try adding this

    const weakPassword = { ...newUserPayload, password: 'password1234' }

    await expect(createUser(adminUserId, weakPassword))
        .rejects.toThrow('Geslo je preveč pogosto.')
    })

})

// ─── updateOwnProfile ────────────────────────────────────────────────────────

function mockAnonQuery(result) {
  const chain = {
    select:      vi.fn().mockReturnThis(),
    update:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    ilike:       vi.fn().mockReturnThis(),
    neq:         vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  chain.select.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.ilike.mockReturnValue(chain)
  chain.neq.mockReturnValue(chain)
  return chain
}

const currentUser = { id: 'current-user-uuid', email: 'me@example.com' }

describe('updateOwnProfile()', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('throws when not logged in', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('no session') })

    await expect(updateOwnProfile({ username: 'newname' })).rejects.toThrow('Niste prijavljeni.')
  })

  test('throws when new username is already taken', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: currentUser }, error: null })
    // duplicate check → existing user found
    mockAnonFrom.mockReturnValueOnce(mockAnonQuery({ data: { id: 'other-uuid' }, error: null }))

    await expect(updateOwnProfile({ username: 'takenname' }))
      .rejects.toThrow('Uporabniško ime "takenname" je že zasedeno.')
  })

  test('updates username successfully when no duplicate', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: currentUser }, error: null })
    // duplicate check → no existing user
    mockAnonFrom.mockReturnValueOnce(mockAnonQuery({ data: null, error: null }))
    // update Users row
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    mockAnonFrom.mockReturnValueOnce(updateChain)

    await expect(updateOwnProfile({ username: 'newname' })).resolves.not.toThrow()
  })

  test('updates personal data (firstName, lastName) without username check', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: currentUser }, error: null })
    // no username → no duplicate check; directly update
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    mockAnonFrom.mockReturnValueOnce(updateChain)

    await expect(updateOwnProfile({ firstName: 'Jana', lastName: 'Novak' })).resolves.not.toThrow()
    expect(mockAnonFrom).toHaveBeenCalledTimes(1)
  })

  test('syncs email to auth.users when email is changed', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: currentUser }, error: null })
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    mockAnonFrom.mockReturnValueOnce(updateChain)
    mockUpdateUser.mockResolvedValueOnce({ error: null })

    await updateOwnProfile({ email: 'new@example.com' })

    expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'new@example.com' })
  })

  test('throws when Users table update fails', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: currentUser }, error: null })
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }) }
    mockAnonFrom.mockReturnValueOnce(updateChain)

    await expect(updateOwnProfile({ firstName: 'Jana' })).rejects.toThrow('DB error')
  })

  test('does nothing when called with no fields', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: currentUser }, error: null })

    await expect(updateOwnProfile({})).resolves.not.toThrow()
    expect(mockAnonFrom).not.toHaveBeenCalled()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

})