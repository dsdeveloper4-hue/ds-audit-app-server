import { JwtPayload } from "jsonwebtoken";

export interface JwtConfig {
  access_token_secret: string;
  access_token_expires_in: string;
  refresh_token_secret: string;
  refresh_token_expires_in: string;
}

export interface Config {
  env: string;
  port: string;
  salt_rounds: string;
  jwt: JwtConfig;
}


export interface CustomJwtPayload extends JwtPayload {
  id: string;
  iat: number;
}
