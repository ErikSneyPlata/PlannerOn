// backend/src/modules/stats/stats.controller.ts
import { Response } from 'express';
import prisma from '../../config/prisma';

export const getDashboardStats = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const now    = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);

    // ── Parallel fetch everything ───────────────────────────────────────────
    const [
      projects,
      tasks,
      habits,
      transactions,
      agendaEvents,
      focusSessions,
      notes,
      recentLogs,
    ] = await Promise.all([
      // Projects with task counts
      prisma.project.findMany({
        where:   { userId },
        include: { _count: { select: { tasks: true } } },
        orderBy: { updatedAt: 'desc' },
      }),

      // All tasks
      prisma.task.findMany({
        where:   { userId },
        include: { project: { select: { title: true, color: true } } },
        orderBy: { updatedAt: 'desc' },
      }),

      // Habits (all)
      prisma.habit.findMany({
        where:   { userId },
        orderBy: { createdAt: 'asc' },
      }),

      // Transactions
      prisma.transaction.findMany({
        where:   { userId },
        orderBy: { date: 'desc' },
      }),

      // Agenda events upcoming (next 7 days)
      prisma.agendaEvent.findMany({
        where: {
          userId,
          startDate: { gte: todayStart, lte: new Date(todayStart.getTime() + 7 * 86400000) },
        },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),

      // Focus sessions
      prisma.focusSession.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),

      // Notes count
      prisma.note.findMany({
        where:   { userId },
        select:  { id: true, isPinned: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),

      // Recent event logs
      prisma.eventLog.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // ── Projects ─────────────────────────────────────────────────────────────
    const activeProjects    = projects.filter(p => p.status === 'ACTIVE');
    const completedProjects = projects.filter(p => p.status === 'COMPLETED');
    const overdueProjects   = projects.filter(p =>
      p.dueDate && new Date(p.dueDate) < now && p.status !== 'COMPLETED' && p.status !== 'ARCHIVED'
    );
    const avgProjectProgress = projects.length
      ? Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length)
      : 0;

    // Top 4 active projects for the card strip
    const topProjects = activeProjects.slice(0, 4).map(p => ({
      id:          p.id,
      title:       p.title,
      color:       p.color,
      progress:    p.progress,
      priority:    p.priority,
      dueDate:     p.dueDate,
      taskCount:   p._count.tasks,
    }));

    // ── Tasks ────────────────────────────────────────────────────────────────
    const tasksPending    = tasks.filter(t => !['COMPLETED','ARCHIVED'].includes(t.status));
    const tasksCompleted  = tasks.filter(t => t.status === 'COMPLETED');
    const tasksOverdue    = tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now && !['COMPLETED','ARCHIVED'].includes(t.status)
    );
    const tasksToday      = tasks.filter(t =>
      t.dueDate &&
      new Date(t.dueDate) >= todayStart &&
      new Date(t.dueDate) < new Date(todayStart.getTime() + 86400000) &&
      !['COMPLETED','ARCHIVED'].includes(t.status)
    );
    const tasksThisWeek   = tasks.filter(t =>
      t.createdAt >= weekStart && t.status === 'COMPLETED'
    );

    // Recent 5 pending tasks for quick view
    const recentTasks = tasksPending
      .sort((a, b) => {
        const pa = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3, SOMEDAY: 4 };
        return (pa[a.priority as keyof typeof pa] ?? 2) - (pa[b.priority as keyof typeof pa] ?? 2);
      })
      .slice(0, 5)
      .map(t => ({
        id:          t.id,
        title:       t.title,
        priority:    t.priority,
        status:      t.status,
        dueDate:     t.dueDate,
        projectTitle: t.project?.title ?? null,
        projectColor: t.project?.color ?? null,
      }));

    // ── Finance ───────────────────────────────────────────────────────────────
    const income      = transactions.filter(t => t.type === 'INCOME');
    const expenses    = transactions.filter(t => t.type === 'EXPENSE');
    const investments = transactions.filter(t => t.type === 'INVESTMENT');
    const subs        = transactions.filter(t => t.type === 'SUBSCRIPTION');

    const totalIncome  = income.reduce((a, t) => a + t.amount, 0);
    const totalExpense = expenses.reduce((a, t) => a + t.amount, 0) +
                         subs.reduce((a, t) => a + t.amount, 0);
    const totalBalance = totalIncome - totalExpense;
    const totalInvested= investments.reduce((a, t) => a + t.amount, 0);

    // This month vs last month income
    const thisMonthIncome = income
      .filter(t => new Date(t.date) >= monthStart)
      .reduce((a, t) => a + t.amount, 0);
    const lastMonthIncome = income
      .filter(t => new Date(t.date) >= lastMonthStart && new Date(t.date) <= lastMonthEnd)
      .reduce((a, t) => a + t.amount, 0);
    const incomeChange = lastMonthIncome
      ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100)
      : 0;

    // Last 5 transactions
    const recentTransactions = transactions.slice(0, 5).map(t => ({
      id:       t.id,
      title:    t.title,
      amount:   t.amount,
      type:     t.type,
      category: t.category,
      date:     t.date,
    }));

    // ── Habits ────────────────────────────────────────────────────────────────
    // Note: no HabitLog model in schema — we track via EventLog or just count habits
    const activeHabits = habits.length;

    // ── Focus sessions ────────────────────────────────────────────────────────
    // duration is stored in SECONDS (the timer works in seconds, not minutes)
    const completedSessions = focusSessions.filter(s => s.completed);

    const todayFocusSeconds = focusSessions
      .filter(s => s.completed && new Date(s.createdAt) >= todayStart)
      .reduce((a, s) => a + s.duration, 0);
    const weekFocusSeconds = focusSessions
      .filter(s => s.completed && new Date(s.createdAt) >= weekStart)
      .reduce((a, s) => a + s.duration, 0);
    const totalFocusSeconds = completedSessions.reduce((a, s) => a + s.duration, 0);

    // Convert to minutes for display (floor to avoid rounding up partial minutes)
    const todayFocusMinutes = Math.floor(todayFocusSeconds / 60);
    const weekFocusMinutes  = Math.floor(weekFocusSeconds  / 60);
    const totalFocusMinutes = Math.floor(totalFocusSeconds / 60);

    // ── Agenda ────────────────────────────────────────────────────────────────
    const upcomingEvents = agendaEvents.map(e => ({
      id:          e.id,
      title:       e.title,
      category:    e.category,
      startDate:   e.startDate,
      endDate:     e.endDate,
      description: e.description,
    }));

    // ── Notes ─────────────────────────────────────────────────────────────────
    const totalNotes  = notes.length;
    const pinnedNotes = notes.filter(n => n.isPinned).length;

    // ── Productivity score (0-100) ─────────────────────────────────────────────
    // Simple heuristic: tasks completed this week / (tasks + 1) * 50
    //                 + focus sessions this week * 2 (capped at 50)
    const taskScore    = Math.min(50, (tasksThisWeek.length / Math.max(tasksPending.length + 1, 1)) * 50);
    const focusScore   = Math.min(50, Math.floor(weekFocusMinutes / 30) * 5);
    const productivityScore = Math.round(taskScore + focusScore);

    // ── Build response ────────────────────────────────────────────────────────
    res.json({
      summary: {
        // Projects
        totalProjects:       projects.length,
        activeProjects:      activeProjects.length,
        completedProjects:   completedProjects.length,
        overdueProjects:     overdueProjects.length,
        avgProjectProgress,
        // Tasks
        totalTasks:          tasks.length,
        tasksPending:        tasksPending.length,
        tasksCompleted:      tasksCompleted.length,
        tasksOverdue:        tasksOverdue.length,
        tasksToday:          tasksToday.length,
        tasksCompletedWeek:  tasksThisWeek.length,
        // Finance
        totalIncome,
        totalExpense,
        totalBalance,
        totalInvested,
        thisMonthIncome,
        lastMonthIncome,
        incomeChange,
        // Habits & Focus
        activeHabits,
        totalHabits:         habits.length,
        totalFocusMinutes,
        todayFocusMinutes,
        weekFocusMinutes,
        // Notes
        totalNotes,
        pinnedNotes,
        // Agenda
        upcomingEventCount:  upcomingEvents.length,
        // Score
        productivityScore,
      },
      topProjects,
      recentTasks,
      recentTransactions,
      upcomingEvents,
      recentActivity: recentLogs.map(l => ({
        id:        l.id,
        action:    l.action,
        details:   l.details,
        createdAt: l.createdAt,
      })),
    });

  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Stats failed', details: error.message });
  }
};