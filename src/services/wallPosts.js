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

async function assertScrumMasterOrAdmin(projectId, userId) {
    const { data: roleData } = await supabase
        .from('UserRoles')
        .select('Roles(name)')
        .eq('FK_userId', userId);

    const isAdmin = roleData?.some(r => r.Roles?.name === 'Admin');
    if (isAdmin) return;

    const { data: membership } = await supabase
        .from('ProjectUsers')
        .select('ProjectRoles(projectRole)')
        .eq('FK_projectId', projectId)
        .eq('FK_userId', userId);

    const isScrumMaster = membership?.some(m => m.ProjectRoles?.projectRole === 'Scrum Master');
    if (!isScrumMaster) throw new Error('Samo skrbniki metodologije lahko brišejo objave in komentarje.');
}

async function enrichWithAuthors(rows) {
    if (!rows || rows.length === 0) return [];
    const userIds = [...new Set(rows.map(r => r.FK_userId).filter(Boolean))];
    const { data: users, error } = await supabase
        .from('Users')
        .select('id, username, name, surname')
        .in('id', userIds);
    if (error) throw new Error(error.message);
    const usersMap = Object.fromEntries((users ?? []).map(u => [u.id, u]));
    return rows.map(r => ({ ...r, Users: usersMap[r.FK_userId] ?? null }));
}

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
    return enrichWithAuthors(posts ?? []);
}

export async function getCommentsForPost(postId) {
    const user = await getSessionUser();

    const { data: post, error: postError } = await supabase
        .from('WallPosts')
        .select('FK_projectId')
        .eq('id', postId)
        .single();

    if (postError) throw new Error(postError.message);
    await assertProjectMember(post.FK_projectId, user.id);

    const { data: comments, error } = await supabase
        .from('WallPosts')
        .select('id, content, created_at, FK_userId')
        .eq('responseTo', postId)
        .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return enrichWithAuthors(comments ?? []);
}

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

export async function createWallComment(postId, content) {
    if (!content || !content.trim()) throw new Error('Vsebina komentarja ne sme biti prazna.');

    const user = await getSessionUser();

    const { data: post, error: postError } = await supabase
        .from('WallPosts')
        .select('FK_projectId, responseTo')
        .eq('id', postId)
        .single();

    if (postError) throw new Error(postError.message);
    if (post.responseTo !== null) throw new Error('Ni mogoče komentirati komentarja.');

    await assertProjectMember(post.FK_projectId, user.id);

    const { data: comment, error } = await supabase
        .from('WallPosts')
        .insert({
            FK_projectId: post.FK_projectId,
            FK_userId: user.id,
            content: content.trim(),
            responseTo: postId,
        })
        .select('id, content, created_at, FK_userId')
        .single();

    if (error) throw new Error(error.message);

    const { data: userData } = await supabase
        .from('Users')
        .select('id, username, name, surname')
        .eq('id', user.id)
        .maybeSingle();

    return { ...comment, Users: userData ?? null };
}

export async function deleteWallPost(postId) {
    const user = await getSessionUser();

    const { data: post, error: postError } = await supabase
        .from('WallPosts')
        .select('FK_projectId, responseTo')
        .eq('id', postId)
        .single();

    if (postError) throw new Error(postError.message);
    if (post.responseTo !== null) throw new Error('To je komentar, ne objava.');

    await assertScrumMasterOrAdmin(post.FK_projectId, user.id);

    const { error: commentsError } = await supabase
        .from('WallPosts')
        .delete()
        .eq('responseTo', postId);

    if (commentsError) throw new Error(commentsError.message);

    const { error } = await supabase
        .from('WallPosts')
        .delete()
        .eq('id', postId);

    if (error) throw new Error(error.message);
    return true;
}

export async function deleteWallComment(commentId) {
    const user = await getSessionUser();

    const { data: comment, error: commentError } = await supabase
        .from('WallPosts')
        .select('FK_projectId, responseTo')
        .eq('id', commentId)
        .single();

    if (commentError) throw new Error(commentError.message);
    if (comment.responseTo === null) throw new Error('To ni komentar.');

    await assertScrumMasterOrAdmin(comment.FK_projectId, user.id);

    const { error } = await supabase
        .from('WallPosts')
        .delete()
        .eq('id', commentId);

    if (error) throw new Error(error.message);
    return true;
}
