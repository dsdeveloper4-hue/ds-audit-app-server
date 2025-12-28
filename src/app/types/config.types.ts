import { JwtPayload } from "jsonwebtoken";

export interface JwtConfig {
  access_token_secret: string;
  access_token_expires_in: string;
  refresh_token_secret: string;
  refresh_token_expires_in: string;
}

export interface cloudinary {
  cloudname: string;
  cloudinary_api_key: string;
  cloudinary_api_secret: string;
  cloudinary_url: string;
}

export interface EmailConfig {
  user: string;
  password: string;
  from_name: string;
}

export interface Config {
  env: string;
  port: string;
  salt_rounds: string;
  frontend_url: string;
  jwt: JwtConfig;
  cloudinary: cloudinary;
  email: EmailConfig;
}

export interface CustomJwtPayload extends JwtPayload {
  id: string;
  iat: number;
}
