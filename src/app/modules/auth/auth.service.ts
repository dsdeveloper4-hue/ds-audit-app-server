// modules/auth/auth.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import bcrypt from "bcryptjs";
import jwtHelpers from "@app/helpers/jwtHelpers";
import config from "@app/config";
import httpStatus from "http-status";
import { AuthTokens } from "@app/types";
import { Role } from "@prisma/client";

// ---------------- REGISTER ----------------
const register = async (req: Request): Promise<AuthTokens> => {
  const { name, mobile, password, role } = req.body as {
    name: string;
    mobile: string;
    password: string;
    role?: Role; // optional, default USER
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

  // Validate role if provided
  const userRole = role || Role.USER;
  if (!Object.values(Role).includes(userRole)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid role provided");
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.salt_rounds)
  );

  // Create user with role
  const user = await prisma.user.create({
    data: {
      name,
      mobile,
      password: hashedPassword,
      role: userRole,
    },
  });

  const accessToken = jwtHelpers.generateToken(
    { id: user.id, role: user.role },
    config.jwt.access_token_secret,
    Number(config.jwt.access_token_expires_in)
  );

  const refreshToken = jwtHelpers.generateToken(
    { id: user.id, role: user.role },
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
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid mobile or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid mobile or password");
  }

 const jwtPayload = { id: user.id, role: user.role, name: user.name };

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
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

   const jwtPayload = {
    id: user.id,
    role: user.role,
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
