export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}