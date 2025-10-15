// modules/auth/auth.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import bcrypt from "bcryptjs";
import jwtHelpers from "@app/helpers/jwtHelpers";
import config from "@app/config";
import httpStatus from "http-status";
import { AuthTokens } from "@app/types";

// ---------------- REGISTER ----------------
const register = async (req: Request): Promise<AuthTokens> => {
  const { name, mobile, password, roleName } = req.body as {
    name: string;
    mobile: string;
    password: string;
    roleName?: string; // optional, default USER
  };

  if (!name || !mobile || !password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Name, mobile, and password are required"
    );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { mobile } });
  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, "Mobile number already registered");
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.salt_rounds)
  );

  // Find or create role
  const role = await prisma.role.upsert({
    where: { name: roleName || "USER" },
    update: {},
    create: {
      name: roleName || "USER",
      description: roleName === "ADMIN" ? "Admin role" : "Regular user role",
    },
  });

  // Create user with role
  const user = await prisma.user.create({
    data: {
      name,
      mobile,
      password: hashedPassword,
      role_id: role.id,
    },
    include: { role: true },
  });

  const accessToken = jwtHelpers.generateToken(
    { id: user.id, roleName: user.role?.name },
    config.jwt.access_token_secret,
    Number(config.jwt.access_token_expires_in)
  );

  const refreshToken = jwtHelpers.generateToken(
    { id: user.id, roleName: user.role?.name },
    config.jwt.refresh_token_secret,
    Number(config.jwt.refresh_token_expires_in)
  );

  return { accessToken, refreshToken };
};

// ---------------- LOGIN ----------------
const login = async (req: Request): Promise<AuthTokens> => {
  const { mobile, password } = req.body as { mobile: string; password: string };

  if (!mobile || !password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Mobile and password are required"
    );
  }

  const user = await prisma.user.findUnique({
    where: { mobile },
    include: { role: true },
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid mobile or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid mobile or password");
  }

 const jwtPayload = { id: user.id, roleName: user.role?.name, name: user.name };

  const accessToken = jwtHelpers.generateToken(
    { ...jwtPayload},
    config.jwt.access_token_secret,
    Number(config.jwt.access_token_expires_in)
  );

  const refreshToken = jwtHelpers.generateToken(
    { ...jwtPayload },
    config.jwt.refresh_token_secret,
    Number(config.jwt.refresh_token_expires_in)
  );

  return { accessToken, refreshToken };
};

// ---------------- REFRESH TOKEN ----------------
const refreshToken = async (
  req: Request
): Promise<Pick<AuthTokens, "accessToken">> => {
  const token = req.cookies.refreshToken as string;
  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token missing");
  }

  let decodedData: any;
  try {
    decodedData = jwtHelpers.verifyToken(
      token,
      config.jwt.refresh_token_secret
    );
  } catch {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: decodedData.id },
    include: { role: true },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

   const jwtPayload = {
    id: user.id,
    roleName: user.role.name,
    name: user.name,
  };

  const accessToken = jwtHelpers.generateToken(
    { ...jwtPayload },
    config.jwt.access_token_secret,
    Number(config.jwt.access_token_expires_in)
  );

  return { accessToken };
};

export const authService = {
  register,
  login,
  refreshToken,
};
