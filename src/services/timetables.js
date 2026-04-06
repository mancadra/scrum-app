import { supabase } from "../config/supabase";

async function getSessionUser() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    const user = data?.session?.user;
    if (!user) throw new Error('Niste prijavljeni.');
    return user;
}

/**
 * Start a work timer on a task.
 * - Task must be accepted by the current user and not finished.
 * - Task must belong to an active sprint.
 * - No open timer may already be running for this user+task.
 */
export async function startTimer(taskId) {
    const user = await getSessionUser();

    const { data: task, error: taskError } = await supabase
        .from('Tasks')
        .select('id, FK_acceptedDeveloper, finished, FK_userStoryId')
        .eq('id', taskId)
        .maybeSingle();

    if (taskError) throw new Error(taskError.message);
    if (!task) throw new Error('Naloga ni bila najdena.');
    if (task.finished) throw new Error('Ni mogoče začeti dela na zaključeni nalogi.');
    if (task.FK_acceptedDeveloper !== user.id) throw new Error('Začnete lahko delo samo na nalogi, ki ste jo sprejeli.');

    const { data: story, error: storyError } = await supabase
        .from('UserStories')
        .select('realized, testing')
        .eq('id', task.FK_userStoryId)
        .maybeSingle();

    if (storyError) throw new Error(storyError.message);
    if (story?.realized) throw new Error('Zgodba je že realizirana.');
    if (story?.testing) throw new Error('Zgodba je v fazi testiranja.');

    // Task must be in an active sprint
    const { data: sprintLinks, error: sprintError } = await supabase
        .from('SprintUserStories')
        .select('FK_sprintId, Sprints(startingDate, endingDate)')
        .eq('FK_userStoryId', task.FK_userStoryId);

    if (sprintError) throw new Error(sprintError.message);

    const now = new Date();
    const isInActiveSprint = sprintLinks?.some(link => {
        const start = link.Sprints?.startingDate ? new Date(link.Sprints.startingDate) : null;
        const end = link.Sprints?.endingDate ? new Date(link.Sprints.endingDate) : null;
        return start && end && start <= now && end >= now;
    });

    if (!isInActiveSprint) throw new Error('Naloga ne pripada aktivnemu sprintu.');

    // Check for an already open timer for this user+task
    const { data: openEntry, error: openError } = await supabase
        .from('TimeTables')
        .select('id')
        .eq('FK_taskId', taskId)
        .eq('FK_userId', user.id)
        .is('stoptime', null)
        .maybeSingle();

    if (openError) throw new Error(openError.message);
    if (openEntry) throw new Error('Časovnik za to nalogo je že zagnan.');

    const { data: entry, error: insertError } = await supabase
        .from('TimeTables')
        .insert({ FK_userId: user.id, FK_taskId: taskId, starttime: now.toISOString(), stoptime: null })
        .select()
        .single();

    if (insertError) throw new Error(insertError.message);
    return entry;
}

/**
 * Stop the running work timer on a task.
 * Closes the open TimeTables entry for this user+task.
 */
export async function stopTimer(taskId) {
    const user = await getSessionUser();

    const { data: openEntry, error: openError } = await supabase
        .from('TimeTables')
        .select('id, starttime')
        .eq('FK_taskId', taskId)
        .eq('FK_userId', user.id)
        .is('stoptime', null)
        .maybeSingle();

    if (openError) throw new Error(openError.message);
    if (!openEntry) throw new Error('Ni zagnanega časovnika za to nalogo.');

    const stoptime = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
        .from('TimeTables')
        .update({ stoptime })
        .eq('id', openEntry.id)
        .select()
        .single();

    if (updateError) throw new Error(updateError.message);
    return updated;
}

/**
 * Returns the open TimeTables entry for a user+task, or null if none.
 */
export async function getActiveTimer(taskId) {
    const user = await getSessionUser();

    const { data, error } = await supabase
        .from('TimeTables')
        .select('id, starttime')
        .eq('FK_taskId', taskId)
        .eq('FK_userId', user.id)
        .is('stoptime', null)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? null;
}

/**
 * Returns the currently running timer for the logged-in user (across all tasks),
 * with task, story, and project info for display in the global timer bar.
 * Returns null if no timer is running.
 */
export async function getMyActiveTimer() {
    const user = await getSessionUser();

    const { data, error } = await supabase
        .from('TimeTables')
        .select(`
            id, starttime,
            Tasks (
                id, description,
                UserStories (
                    id, name,
                    Projects ( id, name )
                )
            )
        `)
        .eq('FK_userId', user.id)
        .is('stoptime', null)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
        entryId:         data.id,
        taskId:          data.Tasks?.id ?? null,
        taskDescription: data.Tasks?.description ?? '',
        storyName:       data.Tasks?.UserStories?.name ?? '',
        projectId:       data.Tasks?.UserStories?.Projects?.id ?? null,
        projectName:     data.Tasks?.UserStories?.Projects?.name ?? '',
        starttime:       data.starttime,
    };
}
