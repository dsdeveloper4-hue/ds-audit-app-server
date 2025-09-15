export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  [key: string]: any; // other user info
}


export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}