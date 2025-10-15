// modules/room/room.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { Room } from "@prisma/client";

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

  const room = await prisma.room.create({
    data: {
      name,
      floor,
      department,
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

  const updatedRoom = await prisma.room.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(floor !== undefined && { floor }),
      ...(department !== undefined && { department }),
    },
  });

  return updatedRoom;
};

// ---------------- DELETE ROOM ----------------
const deleteRoom = async (id: string): Promise<Room> => {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  const deletedRoom = await prisma.room.delete({
    where: { id },
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
