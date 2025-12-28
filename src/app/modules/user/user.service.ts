// modules/user/user.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import config from "@app/config";
import { User, Role } from "@prisma/client";

// ---------------- HELPER: GRANT ALL PERMISSIONS TO USER ----------------
const grantAllPermissionsToUser = async (userId: string): Promise<void> => {
  // Fetch all available permissions
  const allPermissions = await prisma.permission.findMany({
    select: { id: true, name: true },
  });

  // Create UserPermission records for each permission
  const userPermissions = allPermissions.map((permission) => ({
    user_id: userId,
    permission_id: permission.id,
    granted: true,
  }));

  // Bulk create all permissions for the user
  await prisma.userPermission.createMany({
    data: userPermissions,
    skipDuplicates: true, // Skip if permission already exists
  });

  console.log(
    `✅ Granted ${allPermissions.length} permissions to user ${userId}`
  );
};

// ---------------- CREATE USER ----------------
const createUser = async (req: Request): Promise<Omit<User, "password">> => {
  const currentUser = req.user as User;
  const { name, email, password, role } = req.body as {
    name: string;
    email: string;
    password: string;
    role: Role;
  };
  if (!name || !email || !password || !role) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Name, email, password, and role are required"
    );
  }

  // Validate role enum
  if (!Object.values(Role).includes(role)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid role provided");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, "Email already registered");
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

  // EDITOR role restrictions - EDITOR cannot create users at all (defense in depth)
  // This is blocked by route guards, but adding explicit check for security
  if (currentUser.role === "EDITOR") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Editors do not have permission to create users"
    );
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.salt_rounds)
  );

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      auth_provider: "local",
    },
  });

  // If user is SUPER_ADMIN, grant all permissions
  if (role === "SUPER_ADMIN") {
    await grantAllPermissionsToUser(user.id);
  }

  // Log creation in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: currentUser.id,
      entity_type: "User",
      entity_id: user.id,
      entity_name: user.name,
      action_type: "CREATE",
      after: { name: user.name, email: user.email, role: user.role },
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
  const { name, email, role, password } = req.body as {
    name?: string;
    email?: string;
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

  // EDITOR role restrictions - EDITOR cannot modify any users (defense in depth)
  // This is blocked by route guards, but adding explicit check for security
  if (currentUser.role === "EDITOR") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Editors do not have permission to modify users"
    );
  }

  // Check if email is being changed and already exists
  if (email && email !== user.email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(httpStatus.CONFLICT, "Email already registered");
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

  const before = { name: user.name, email: user.email, role: user.role };

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(role && { role }),
      ...(hashedPassword && { password: hashedPassword }),
    },
  });

  // If role is being changed to SUPER_ADMIN, grant all permissions
  if (role && role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
    await grantAllPermissionsToUser(updatedUser.id);
  }

  // Log update in history
  const changes: string[] = [];
  if (name && name !== user.name) changes.push(`name: ${user.name} → ${name}`);
  if (email && email !== user.email)
    changes.push(`email: ${user.email} → ${email}`);
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
          email: updatedUser.email,
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

  // EDITOR role restrictions - EDITOR cannot delete any users (defense in depth)
  // This is blocked by route guards, but adding explicit check for security
  if (currentUser.role === "EDITOR") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Editors do not have permission to delete users"
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
      before: { name: user.name, email: user.email, role: user.role },
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
