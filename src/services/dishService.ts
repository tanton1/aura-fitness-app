import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { HealthyDish } from '../types';
import { healthyDishes as fallbackDishes } from '../data/healthyDishes';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export const fetchHealthyDishes = async (): Promise<HealthyDish[]> => {
  const path = 'healthyDishes';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const dishes: HealthyDish[] = [];
    querySnapshot.forEach((doc) => {
      dishes.push({ id: doc.id, ...doc.data() } as HealthyDish);
    });
    
    if (dishes.length === 0) return fallbackDishes;
    
    return dishes;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    console.warn("Falling back to local dish data due to Firestore error.");
    return fallbackDishes;
  }
};
