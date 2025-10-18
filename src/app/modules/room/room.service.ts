// modules/room/room.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { Room, User } from "@prisma/client";

// ---------------- CREATE ROOM ----------------
const createRoom = async (req: Request): Promise<Room> => {
  const { name, floor, department } = req.body as {
    name: string;
    floor?: string;
    department?: string;
  };

  if (!name) {
    throw new AppError(httpStatus.BAD_REQUEST, "Room name is required");
  }

  const user = req.user as User;

  const room = await prisma.room.create({
    data: {
      name,
      floor,
      department,
    },
  });

  // Log creation in history
  const details = [];
  if (room.floor) details.push(`Floor: ${room.floor}`);
  if (room.department) details.push(`Department: ${room.department}`);
  const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : '';
  
  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "Room",
      entity_id: room.id,
      entity_name: room.name,
      action_type: "CREATE",
      after: room,
      description: `Created room: ${room.name}${detailsStr}`,
    },
  });

  return room;
};

// ---------------- GET ALL ROOMS ----------------
const getAllRooms = async (): Promise<Room[]> => {
  const rooms = await prisma.room.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: { itemDetails: true },
      },
    },
  });

  return rooms;
};

// ---------------- GET ROOM BY ID ----------------
const getRoomById = async (id: string): Promise<Room> => {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      itemDetails: {
        include: {
          item: true,
          audit: {
            select: {
              id: true,
              month: true,
              year: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  return room;
};

// ---------------- UPDATE ROOM ----------------
const updateRoom = async (id: string, req: Request): Promise<Room> => {
  const { name, floor, department } = req.body as {
    name?: string;
    floor?: string;
    department?: string;
  };

  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  const user = req.user as User;
  const before = { ...room };

  const updatedRoom = await prisma.room.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(floor !== undefined && { floor }),
      ...(department !== undefined && { department }),
    },
  });

  // Log update in history
  const changes: string[] = [];
  if (name && name !== room.name) changes.push(`name: ${room.name} → ${name}`);
  if (floor !== undefined && floor !== room.floor) changes.push(`floor: ${room.floor} → ${floor}`);
  if (department !== undefined && department !== room.department) changes.push(`department: ${room.department} → ${department}`);

  if (changes.length > 0) {
    await prisma.recentActivityHistory.create({
      data: {
        user_id: user.id,
        entity_type: "Room",
        entity_id: room.id,
        entity_name: room.name,
        action_type: "UPDATE",
        before,
        after: updatedRoom,
        change_summary: { changes },
        description: `Updated room: ${changes.join(", ")}`,
      },
    });
  }

  return updatedRoom;
};

// ---------------- DELETE ROOM ----------------
const deleteRoom = async (id: string, req: Request): Promise<Room> => {
  const user = req.user as User;
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  const deletedRoom = await prisma.room.delete({
    where: { id },
  });

  // Log deletion in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "Room",
      entity_id: room.id,
      entity_name: room.name,
      action_type: "DELETE",
      before: room,
      description: `Deleted room: ${room.name}`,
    },
  });

  return deletedRoom;
};

export const roomService = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
};
