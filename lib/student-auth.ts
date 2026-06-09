const STORAGE_KEY = "edulocka_student_token";
const PROFILE_KEY = "edulocka_student_profile";

export interface StoredStudentProfile {
  studentId: string;
  studentName: string;
  institutions: { name: string; count: number }[];
  totalCertificates: number;
}

export function saveStudentSession(token: string, profile: StoredStudentProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getStudentToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function getStoredStudentProfile(): StoredStudentProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStudentSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function isStudentLoggedIn(): boolean {
  const token = getStudentToken();
  if (!token) return false;
  try {
    // Decode payload (no verify — just check expiry client-side)
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
}
