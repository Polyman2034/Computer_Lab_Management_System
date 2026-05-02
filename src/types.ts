export type UserRole = 'student' | 'teacher' | 'assistant' | 'admin';
export type UserStatus = 'active' | 'blocked';
export type PCStatus = 'available' | 'occupied' | 'maintenance';
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no-show';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface Lab {
  id: string;
  name: string;
  description: string;
  totalPCs: number;
  location: string;
}

export interface Computer {
  id: string;
  labId: string;
  pcNumber: number;
  status: PCStatus;
  specs?: string;
}

export interface Booking {
  id: string;
  userId: string;
  labId: string;
  computerId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
}

export interface TimetableEntry {
  id: string;
  labId: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  title: string;
  description: string;
  reservedFor: string; // e.g. "Class 10A", "Maintenance"
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
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
