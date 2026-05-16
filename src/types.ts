export type Plan = 'free' | 'starter' | 'business' | 'enterprise';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  plan: string;
  balance?: number;
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceToken: string;
  lastSeen: string;
  status: 'online' | 'offline';
}

export interface Transaction {
  id: string;
  userId: string;
  deviceId: string;
  provider: string;
  amount: number;
  trxId: string;
  sender: string;
  message: string;
  phone: string;
  transactionTime: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  amount: number;
  startDate: string;
  expireDate: string;
  status: 'active' | 'expired';
  paymentMethod: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  externalId?: string;
  amount: number;
  senderPhone?: string;
  provider?: string;
  webhookUrl?: string;
  status: 'pending' | 'matched' | 'failed';
  matchedTransactionId?: string;
  createdAt: string;
}

export interface UserDeposit {
  id: string;
  userId: string;
  userName?: string;
  method: string;
  amount: number;
  trxId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

export interface SystemConfig {
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  appVersion?: string;
  isMaintenance?: boolean;
  announcement?: string;
  updatedAt?: string;
}

export interface PlanDefinition {
  id: string;
  name: string;
  price: number;
  features: string[];
  badge?: string;
  isPopular?: boolean;
  order?: number;
}

export interface RawSMS {
  id: string;
  userId: string;
  deviceId: string;
  sender: string;
  message: string;
  timestamp: string;
  status: 'processed' | 'unprocessed';
}
