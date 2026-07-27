export interface AuthUser {
  userId: string;
  email: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}
