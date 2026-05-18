import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  setDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Transaction, UserProfile, Device, DepositRequest } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const userService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const path = `users/${userId}`;
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (!snap.exists()) return null;
      return snap.data() as UserProfile;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return null;
    }
  },

  async createProfile(profile: UserProfile) {
    const path = `users/${profile.id}`;
    try {
      await setDoc(doc(db, 'users', profile.id), profile);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
};

export const transactionService = {
  subscribeToTransactions(userId: string, callback: (txs: Transaction[]) => void) {
    const q = query(
      collection(db, 'transactions'), 
      where('userId', '==', userId), 
      // orderBy removed to avoid index requirement
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      // Sort client-side
      txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(txs.slice(0, 50));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'transactions');
    });
  }
};

export const deviceService = {
  subscribeToDevices(userId: string, callback: (devices: Device[]) => void) {
    const q = query(collection(db, 'devices'), where('userId', '==', userId));
    return onSnapshot(q, (snap) => {
      const devices = snap.docs.map(d => ({ id: d.id, ...d.data() } as Device));
      callback(devices);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'devices');
    });
  }
};

export const depositService = {
  subscribeToRequests(userId: string, callback: (requests: DepositRequest[]) => void) {
    const q = query(
      collection(db, 'depositRequests'), 
      where('userId', '==', userId),
      // orderBy removed to avoid index requirement
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as DepositRequest));
      // Sort client-side
      requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(requests.slice(0, 20));
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'depositRequests');
    });
  }
};
