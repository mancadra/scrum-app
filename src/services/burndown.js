import { supabase } from '../config/supabase';

/**
 * Fetch all data needed to render a sprint burndown chart.
 *
 * Returns:
 *  - sprint: the sprint record
 *  - totalInitialHours: sum of timecomplexity for all tasks in the sprint
 *  - tableRows: [{ date, logged, cumulative, remaining }] — one per calendar day
 *  - idealLine: [{ date, ideal }] — linear decrease from totalInitialHours → 0
 *  - days: ['YYYY-MM-DD', …]
 */
export async function getBurndownData(sprintId) {
    const { data: sprint, error: sprintError } = await supabase
        .from('Sprints')
        .select('id, startingDate, endingDate, startingSpeed, FK_projectId')
        .eq('id', sprintId)
        .single();

    if (sprintError) throw new Error(sprintError.message);
    if (!sprint) throw new Error('Sprint ni najden.');

    // Stories in this sprint
    const { data: sprintStories, error: ssError } = await supabase
        .from('SprintUserStories')
        .select('FK_userStoryId')
        .eq('FK_sprintId', sprintId);

    if (ssError) throw new Error(ssError.message);
    const storyIds = (sprintStories ?? []).map(s => s.FK_userStoryId);

    if (storyIds.length === 0) return buildEmpty(sprint);

    // All tasks for those stories
    const { data: tasks, error: tasksError } = await supabase
        .from('Tasks')
        .select('id, timecomplexity')
        .in('FK_userStoryId', storyIds);

    if (tasksError) throw new Error(tasksError.message);

    const totalInitialHours = (tasks ?? []).reduce((sum, t) => sum + (t.timecomplexity ?? 0), 0);
    const taskIds = (tasks ?? []).map(t => t.id);

    if (taskIds.length === 0) return buildEmpty(sprint);

    // Completed time entries for those tasks
    const { data: timeEntries, error: timeError } = await supabase
        .from('TimeTables')
        .select('starttime, stoptime')
        .in('FK_taskId', taskIds)
        .not('stoptime', 'is', null)
        .order('starttime', { ascending: true });

    if (timeError) throw new Error(timeError.message);

    // Day range: always span the full sprint (start → end)
    const sprintStart = new Date(sprint.startingDate);
    const sprintEnd   = new Date(sprint.endingDate);
    const todayStr    = localDateStr(new Date());

    const days = buildDayList(sprintStart, sprintEnd);

    // Aggregate hours logged per calendar day (use local date to match day list)
    const hoursPerDay = {};
    for (const entry of timeEntries ?? []) {
        const dayKey = localDateStr(new Date(entry.starttime));
        const hours  = (new Date(entry.stoptime) - new Date(entry.starttime)) / 3_600_000;
        hoursPerDay[dayKey] = (hoursPerDay[dayKey] ?? 0) + hours;
    }

    // Build table rows — actual values only up to today, future days left null
    let cumulative = 0;
    const tableRows = days.map(day => {
        const isFuture = day > todayStr;
        if (isFuture) {
            return {
                date:       day,
                logged:     null,
                cumulative: null,
                remaining:  null,
            };
        }
        const logged = hoursPerDay[day] ?? 0;
        cumulative  += logged;
        return {
            date:       day,
            logged:     +logged.toFixed(2),
            cumulative: +cumulative.toFixed(2),
            remaining:  +Math.max(0, totalInitialHours - cumulative).toFixed(2),
        };
    });

    // Ideal line: linear from totalInitialHours → 0
    const totalDays = days.length - 1;
    const idealLine = days.map((day, i) => ({
        date:  day,
        ideal: totalDays > 0
            ? +(totalInitialHours * (1 - i / totalDays)).toFixed(2)
            : 0,
    }));

    return { sprint, totalInitialHours, tableRows, idealLine, days };
}

function buildEmpty(sprint) {
    return { sprint, totalInitialHours: 0, tableRows: [], idealLine: [], days: [] };
}

/** Format a Date as 'YYYY-MM-DD' in local time (avoids UTC shift). */
function localDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function buildDayList(from, to) {
    const days = [];
    const d    = new Date(from);
    d.setHours(0, 0, 0, 0);
    const last = new Date(to);
    last.setHours(23, 59, 59, 999);
    while (d <= last) {
        days.push(localDateStr(d));
        d.setDate(d.getDate() + 1);
    }
    return days;
}
