// modules/user/user.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import config from "@app/config";
import { User } from "@prisma/client";

// ---------------- CREATE USER ----------------
const createUser = async (req: Request): Promise<Omit<User, "password">> => {
  const { name, mobile, password, role_id } = req.body as {
    name: string;
    mobile: string;
    password: string;
    role_id: string;
  };

  if (!name || !mobile || !password || !role_id) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Name, mobile, password, and role_id are required"
    );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { mobile } });
  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, "Mobile number already registered");
  }

  // Check if role exists
  const role = await prisma.role.findUnique({ where: { id: role_id } });
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.salt_rounds)
  );

  const user = await prisma.user.create({
    data: {
      name,
      mobile,
      password: hashedPassword,
      role_id,
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  // Omit password from response
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword as any;
};

// ---------------- GET ALL USERS ----------------
const getAllUsers = async (): Promise<Omit<User, "password">[]> => {
  const users = await prisma.user.findMany({
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  // Omit passwords from response
  return users.map(({ password, ...user }) => user) as any;
};

// ---------------- GET USER BY ID ----------------
const getUserById = async (id: string): Promise<Omit<User, "password">> => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword as any;
};

// ---------------- UPDATE USER ----------------
const updateUser = async (
  id: string,
  req: Request
): Promise<Omit<User, "password">> => {
  const { name, mobile, role_id, password } = req.body as {
    name?: string;
    mobile?: string;
    role_id?: string;
    password?: string;
  };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Check if mobile is being changed and already exists
  if (mobile && mobile !== user.mobile) {
    const existingUser = await prisma.user.findUnique({ where: { mobile } });
    if (existingUser) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Mobile number already registered"
      );
    }
  }

  // Check if role exists if role_id is provided
  if (role_id) {
    const role = await prisma.role.findUnique({ where: { id: role_id } });
    if (!role) {
      throw new AppError(httpStatus.NOT_FOUND, "Role not found");
    }
  }

  // Hash password if provided
  let hashedPassword: string | undefined;
  if (password) {
    hashedPassword = await bcrypt.hash(password, Number(config.salt_rounds));
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(mobile && { mobile }),
      ...(role_id && { role_id }),
      ...(hashedPassword && { password: hashedPassword }),
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const { password: _, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword as any;
};

// ---------------- DELETE USER ----------------
const deleteUser = async (id: string): Promise<Omit<User, "password">> => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const deletedUser = await prisma.user.delete({
    where: { id },
  });

  const { password, ...userWithoutPassword } = deletedUser;
  return userWithoutPassword as any;
};

// ---------------- GET ALL ROLES ----------------
const getAllRoles = async () => {
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: { users: true },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return roles;
};

export const userService = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllRoles,
};
