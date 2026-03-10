import { supabase } from "../config/supabase";
const TOP_100_PASSWORDS = new Set([
  "123456", "password", "123456789", "12345678", "12345",
  "1234567", "qwerty", "abc123", "football", "monkey",
  "letmein", "696969", "shadow", "master", "666666",
  "qwertyuiop", "123321", "mustang", "1234567890", "michael",
  "654321", "superman", "1qaz2wsx", "7777777", "121212",
  "000000", "qazwsx", "123qwe", "killer", "trustno1",
  "jordan", "jennifer", "zxcvbnm", "asdfgh", "hunter",
  "buster", "soccer", "harley", "batman", "andrew",
  "tigger", "sunshine", "iloveyou", "2000", "charlie",
  "robert", "thomas", "hockey", "ranger", "daniel",
  "starwars", "klaster", "112233", "george", "computer",
  "michelle", "jessica", "pepper", "1111", "zxcvbn",
  "555555", "11111111", "131313", "freedom", "777777",
  "pass", "maggie", "159753", "aaaaaa", "ginger",
  "princess", "joshua", "cheese", "amanda", "summer",
  "love", "ashley", "6969", "nicole", "chelsea",
  "biteme", "matthew", "access", "yankees", "987654321",
  "dallas", "austin", "thunder", "taylor", "matrix",
  "minecraft", "dragon", "password1", "qwerty123", "welcome",
  "login", "admin", "solo", "abcdef", "123123",
  "master123", "passw0rd", "superman1", "batman1", "test"
])

export async function signIn(username, password) {
    const { data: userData, error: userError } = await supabase
      .from('Users')
      .select('email')
      .eq('username', username)
      .single()

    if (userError || !userData) throw new Error('Invalid username or password.')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    })

    if (error) throw new Error('Invalid username or password.')
    
    const { data: assuranceData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const needsMFA = assuranceData.nextLevel === 'aal2' &&
    assuranceData.nextLevel !== assuranceData.currentLevel

    if(needsMFA){
      return{mfaRequired: true, userId: data.user.id}
    }
    
    await updateLastLogin(data.user.id)

    return data.user
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
}

export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: profile } = await supabase
      .from('Users')
      .select('*, UserRoles(FK_roleId, Roles(name))')
      .eq('id', user.id)
      .single()

    return { ...user, profile }
}

export async function updateLastLogin(userId) {                                                                                                                                                  
    const { error } = await supabase                                                                                                                                                             
    .from('Users')
    .update({ lastLogin: new Date().toISOString() })
    .eq('id', userId)

    if (error) throw new Error(error.message)
}

export async function changePassword(oldPassword, newPassword) {
    validatePassword(newPassword)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    })

    if (signInError) throw new Error('Old password is incorrect.')

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
}

export function validatePassword(password) {
    if (password.length < 12) throw new Error('Password must be at least 12 characters.')
    if (password.length > 128) throw new Error('Password must not exceed 128 characters.')
    if (/  /.test(password)) throw new Error('Password must not contain consecutive spaces.')
    if (TOP_100_PASSWORDS.has(password.toLowerCase())) throw new Error('Password is too common.')
}