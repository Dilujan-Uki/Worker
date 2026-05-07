export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
  token: string;
}

export interface TimeEntry {
  _id: string;
  user: string;
  task: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  isRunning: boolean;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}
