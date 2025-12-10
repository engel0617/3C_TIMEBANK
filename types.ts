export enum Role {
  PARENT = 'PARENT',
  CHILD = 'CHILD'
}

export enum TaskCategory {
  READING = 'Reading',
  OUTDOOR = 'Outdoor',
  CHORE = 'Chore',
  STUDY = 'Study',
  HEALTH = 'Health',
  OTHER = 'Other'
}

export enum TaskStatus {
  AVAILABLE = 'AVAILABLE',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  password?: string; // Optional for compatibility, but logical for auth
}

export interface ChildProfile extends User {
  balance: number; // in minutes
  totalEarned: number;
  level: number;
  isLocked: boolean;
  weeklyAllowance: number; // minutes per week
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number; // minutes
  category: TaskCategory;
  isCustom: boolean;
  requiresProof: boolean; // photo or timer
  icon: string;
}

export interface Transaction {
  id: string;
  childId: string;
  amount: number; // positive for earning, negative for spending
  description: string;
  timestamp: number;
  type: 'EARN' | 'SPEND' | 'ADJUSTMENT';
  category?: TaskCategory | string;
}

export interface Proof {
  id: string;
  taskId: string;
  childId: string;
  taskTitle: string;
  reward: number;
  timestamp: number;
  imageUrl?: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AllowedApp {
  name: string;
  rule?: string;
}

export interface FamilySettings {
  exchangeRate: number; // 1 coin = X minutes (usually 1)
  weekdayCurfewStart: string; // HH:mm
  weekdayCurfewEnd: string;
  weekendCurfewStart: string;
  weekendCurfewEnd: string;
}