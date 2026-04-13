import { supabase } from "../config/supabase";

async function getSessionUser() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    const user = data?.session?.user;
    if (!user) throw new Error('Niste prijavljeni.');
    return user;
}

async function assertProjectMember(projectId, userId) {
    const { data, error } = await supabase
        .from('ProjectUsers')
        .select('FK_userId')
        .eq('FK_projectId', projectId)
        .eq('FK_userId', userId)
        .limit(1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Niste član tega projekta.');
}

/**
 * Returns all top-level wall posts for a project (no comments),
 * ordered newest first, with author info.
 */
export async function getWallPosts(projectId) {
    const user = await getSessionUser();
    await assertProjectMember(projectId, user.id);

    const { data: posts, error } = await supabase
        .from('WallPosts')
        .select('id, content, created_at, responseTo, FK_userId')
        .eq('FK_projectId', projectId)
        .is('responseTo', null)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!posts || posts.length === 0) return [];

    const userIds = [...new Set(posts.map(p => p.FK_userId).filter(Boolean))];
    const { data: users, error: usersError } = await supabase
        .from('Users')
        .select('id, username, name, surname')
        .in('id', userIds);

    if (usersError) throw new Error(usersError.message);

    const usersMap = Object.fromEntries((users ?? []).map(u => [u.id, u]));

    return posts.map(post => ({
        ...post,
        Users: usersMap[post.FK_userId] ?? null,
    }));
}

/**
 * Create a new top-level wall post on a project.
 * - User must be a member of the project.
 * - Content must not be empty.
 */
export async function createWallPost(projectId, content) {
    if (!content || !content.trim()) throw new Error('Vsebina objave ne sme biti prazna.');

    const user = await getSessionUser();
    await assertProjectMember(projectId, user.id);

    const { data: post, error } = await supabase
        .from('WallPosts')
        .insert({ FK_projectId: projectId, FK_userId: user.id, content: content.trim(), responseTo: null })
        .select('id, content, created_at, responseTo, FK_userId')
        .single();

    if (error) throw new Error(error.message);

    const { data: userData } = await supabase
        .from('Users')
        .select('id, username, name, surname')
        .eq('id', user.id)
        .maybeSingle();

    return { ...post, Users: userData ?? null };
}
