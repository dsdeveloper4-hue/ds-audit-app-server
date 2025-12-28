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
  const { name, email, password } = req.body as {
    name: string;
    email: string;
    password: string;
  };

  if (!name || !email || !password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Name, email, and password are required"
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid email format");
  }

  // Validate password strength
  if (password.length < 6) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Password must be at least 6 characters"
    );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, "Email already registered");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.salt_rounds)
  );

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      auth_provider: "local",
      role: Role.USER,
    },
  });

  // Note: Regular registration creates USER role by default
  // If you need to create SUPER_ADMIN via registration, update role above
  // and uncomment the permission granting below:
  // if (user.role === Role.SUPER_ADMIN) {
  //   const allPermissions = await prisma.permission.findMany();
  //   await prisma.userPermission.createMany({
  //     data: allPermissions.map(p => ({
  //       user_id: user.id,
  //       permission_id: p.id,
  //       granted: true,
  //     })),
  //     skipDuplicates: true,
  //   });
  // }

  const jwtPayload = { id: user.id, role: user.role, name: user.name };

  const accessToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt.access_token_secret,
    Number(config.jwt.access_token_expires_in)
  );

  const refreshToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt.refresh_token_secret,
    Number(config.jwt.refresh_token_expires_in)
  );

  return { accessToken, refreshToken };
};

// ---------------- LOGIN ----------------
const login = async (req: Request): Promise<AuthTokens> => {
  const { email, password } = req.body as {
    email: string;
    password: string;
  };

  if (!email || !password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Email and password are required"
    );
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // Check if user has a password (for local auth)
  if (!user.password) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid authentication method. Please use the correct login method."
    );
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  const jwtPayload = { id: user.id, role: user.role, name: user.name };

  const accessToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt.access_token_secret,
    Number(config.jwt.access_token_expires_in)
  );

  const refreshToken = jwtHelpers.generateToken(
    jwtPayload,
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

// ---------------- FORGOT PASSWORD ----------------
const forgotPassword = async (req: Request): Promise<{ message: string }> => {
  const { email } = req.body as { email: string };

  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Don't reveal if email exists or not (security)
    return {
      message:
        "If an account exists with this email, you will receive a password reset link.",
    };
  }

  // Generate reset token (random string)
  const resetToken =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  // Set token expiry (1 hour from now)
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

  // Save token to database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      reset_token: resetToken,
      reset_token_expires: resetTokenExpires,
    },
  });

  // Send password reset email
  const { sendPasswordResetEmail } = await import("@app/services/emailService");
  await sendPasswordResetEmail(email, resetToken, user.name);

  return {
    message:
      "If an account exists with this email, you will receive a password reset link.",
  };
};

// ---------------- RESET PASSWORD ----------------
const resetPassword = async (req: Request): Promise<{ message: string }> => {
  const { token, newPassword } = req.body as {
    token: string;
    newPassword: string;
  };

  if (!token || !newPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Token and new password are required"
    );
  }

  // Validate password strength
  if (newPassword.length < 6) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Password must be at least 6 characters"
    );
  }

  // Find user with valid token
  const user = await prisma.user.findFirst({
    where: {
      reset_token: token,
      reset_token_expires: {
        gt: new Date(), // Token not expired
      },
    },
  });

  if (!user) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid or expired reset token"
    );
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.salt_rounds)
  );

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null,
    },
  });

  return { message: "Password reset successful! You can now login." };
};

export const authService = {
  register,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
};
