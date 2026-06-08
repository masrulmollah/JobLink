export type ApplicationStatus = "bookmarked" | "applied" | "rejected";

export interface Job {
  id: string;
  url: string;
  roleName: string;
  companyName: string;
  salary: string;
  datePosted: string;
  qualifications: string;
  status: ApplicationStatus;
  createdAt: any; // Firestore Timestamp or number
  updatedAt: any; // Firestore Timestamp or number
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: string;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}
