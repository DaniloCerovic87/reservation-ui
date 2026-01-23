export interface CurrentUser {
  token: string;
  userId: number;
  employeeId?: number | null;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
}
