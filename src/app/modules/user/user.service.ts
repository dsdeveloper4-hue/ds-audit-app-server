// modules/user/user.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import config from "@app/config";
import { User, Role } from "@prisma/client";

// ---------------- CREATE USER ----------------
const createUser = async (req: Request): Promise<Omit<User, "password">> => {
  const currentUser = req.user as User;
  console.log("Current User:", currentUser);
  const { name, mobile, password, role } = req.body as {
    name: string;
    mobile: string;
    password: string;
    role: Role;
  };
  if (!name || !mobile || !password || !role) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Name, mobile, password, and role are required"
    );
  }

  // Validate role enum
  if (!Object.values(Role).includes(role)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid role provided");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { mobile } });
  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, "Mobile number already registered");
  }

  // Admin role restrictions (handled in middleware but double-check here)
  if (
    currentUser.role === "ADMIN" &&
    (role === "ADMIN" || role === "SUPER_ADMIN")
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Admins cannot create other admins or super admins"
    );
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
      role,
    },
  });

  // Log creation in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: currentUser.id,
      entity_type: "User",
      entity_id: user.id,
      entity_name: user.name,
      action_type: "CREATE",
      after: { name: user.name, mobile: user.mobile, role: user.role },
      description: `Created user: ${user.name} (${user.role})`,
    },
  });

  // Omit password from response
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// ---------------- GET ALL USERS ----------------
const getAllUsers = async (): Promise<Omit<User, "password">[]> => {
  const users = await prisma.user.findMany({
    orderBy: {
      created_at: "desc",
    },
  });

  // Omit passwords from response
  return users.map(({ password, ...user }) => user);
};

// ---------------- GET USER BY ID ----------------
const getUserById = async (id: string): Promise<Omit<User, "password">> => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// ---------------- UPDATE USER ----------------
const updateUser = async (
  id: string,
  req: Request
): Promise<Omit<User, "password">> => {
  const currentUser = req.user as User;
  const { name, mobile, role, password } = req.body as {
    name?: string;
    mobile?: string;
    role?: Role;
    password?: string;
  };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // SUPER_ADMIN cannot change their own role
  if (currentUser.role === "SUPER_ADMIN" && currentUser.id === id && role) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot change your own role");
  }

  // Admin role restrictions - cannot modify other admins or super admins
  if (
    currentUser.role === "ADMIN" &&
    (user.role === "ADMIN" || user.role === "SUPER_ADMIN")
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Admins cannot modify other admins or super admins"
    );
  }

  // Admin role restrictions - cannot assign admin or super admin roles
  if (
    currentUser.role === "ADMIN" &&
    role &&
    (role === "ADMIN" || role === "SUPER_ADMIN")
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Admins cannot assign admin or super admin roles"
    );
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

  // Validate role enum if provided
  if (role && !Object.values(Role).includes(role)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid role provided");
  }

  // Hash password if provided
  let hashedPassword: string | undefined;
  if (password) {
    hashedPassword = await bcrypt.hash(password, Number(config.salt_rounds));
  }

  const before = { name: user.name, mobile: user.mobile, role: user.role };

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(mobile && { mobile }),
      ...(role && { role }),
      ...(hashedPassword && { password: hashedPassword }),
    },
  });

  // Log update in history
  const changes: string[] = [];
  if (name && name !== user.name) changes.push(`name: ${user.name} → ${name}`);
  if (mobile && mobile !== user.mobile)
    changes.push(`mobile: ${user.mobile} → ${mobile}`);
  if (role && role !== user.role) changes.push(`role: ${user.role} → ${role}`);
  if (password) changes.push(`password updated`);

  if (changes.length > 0) {
    await prisma.recentActivityHistory.create({
      data: {
        user_id: currentUser.id,
        entity_type: "User",
        entity_id: user.id,
        entity_name: user.name,
        action_type: "UPDATE",
        before,
        after: {
          name: updatedUser.name,
          mobile: updatedUser.mobile,
          role: updatedUser.role,
        },
        change_summary: { changes },
        description: `Updated user: ${changes.join(", ")}`,
      },
    });
  }

  const { password: _, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

// ---------------- DELETE USER ----------------
const deleteUser = async (
  id: string,
  req: Request
): Promise<Omit<User, "password">> => {
  const currentUser = req.user as User;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Admin role restrictions - cannot delete other admins or super admins
  if (
    currentUser.role === "ADMIN" &&
    (user.role === "ADMIN" || user.role === "SUPER_ADMIN")
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Admins cannot delete other admins or super admins"
    );
  }

  if (user.role === "SUPER_ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Super Admins cannot be deleted");
  }

  const deletedUser = await prisma.user.delete({
    where: { id },
  });

  // Log deletion in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: currentUser.id,
      entity_type: "User",
      entity_id: user.id,
      entity_name: user.name,
      action_type: "DELETE",
      before: { name: user.name, mobile: user.mobile, role: user.role },
      description: `Deleted user: ${user.name} (${user.role})`,
    },
  });

  const { password, ...userWithoutPassword } = deletedUser;
  return userWithoutPassword;
};

// ---------------- GET ALL ROLES ----------------
const getAllRoles = async () => {
  // Return the available roles from the enum with user counts
  const roles = Object.values(Role).map(async (role) => {
    const userCount = await prisma.user.count({
      where: { role },
    });

    return {
      name: role,
      value: role,
      userCount,
    };
  });

  return Promise.all(roles);
};

export const userService = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllRoles,
};
