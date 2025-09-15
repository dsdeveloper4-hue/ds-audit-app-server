// src/helpers/jwtHelpers.ts
import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";

interface JwtPayloadCustom extends JwtPayload {
  [key: string]: any; // allow custom fields
}

/**
 * Generate a JWT token
 */
const generateToken = (
  payload: object,
  secret: string,
  expiresIn: string | number
): string => {
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: expiresIn as SignOptions["expiresIn"], // type assertion
  };

  return jwt.sign(payload, secret, options);
};

/**
 * Verify a JWT token
 */
const verifyToken = (token: string, secret: string): JwtPayloadCustom => {
  return jwt.verify(token, secret) as JwtPayloadCustom;
};

const jwtHelpers = {
  generateToken,
  verifyToken,
};

export default jwtHelpers;
