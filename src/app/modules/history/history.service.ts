// modules/history/history.service.ts
import prisma from "@app/lib/prisma";
import { Request } from "express";

// ---------------- GET RECENT ACTIVITY ----------------
const getRecentActivity = async (req: Request): Promise<any> => {
  const { limit = 50, entity_type, entity_id, user_id } = req.query;

  const where: any = {};
  if (entity_type) where.entity_type = entity_type as string;
  if (entity_id) where.entity_id = entity_id as string;
  if (user_id) where.user_id = user_id as string;

  const activities = await prisma.recentActivityHistory.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          mobile: true,
          role: true,
        },
      },
    },
    orderBy: {
      occurred_at: "desc",
    },
    take: Number(limit),
  });

  return activities;
};

// ---------------- GET ACTIVITY STATS ----------------
const getActivityStats = async (): Promise<any> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() - 7);

  const [totalActivities, todayActivities, weekActivities, byEntityType] = await Promise.all([
    prisma.recentActivityHistory.count(),
    prisma.recentActivityHistory.count({
      where: { occurred_at: { gte: today } },
    }),
    prisma.recentActivityHistory.count({
      where: { occurred_at: { gte: thisWeek } },
    }),
    prisma.recentActivityHistory.groupBy({
      by: ["entity_type"],
      _count: true,
      orderBy: {
        _count: {
          entity_type: "desc",
        },
      },
    }),
  ]);

  return {
    totalActivities,
    todayActivities,
    weekActivities,
    byEntityType,
  };
};

export const historyService = {
  getRecentActivity,
  getActivityStats,
};
