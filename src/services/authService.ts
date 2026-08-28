import { dataSource, endpoints, storageKeys } from '@/constants/config';
import { storageService } from '@/services/storageService';
import type { UserProfile } from '@/types';
import { initialsFromName } from '@/utils/format';
import { createId, createReference } from '@/utils/id';

/**
 * Authentication seam. Currently a mock: any email "signs in" and a demo
 * profile is returned, with a fake bearer token kept in SecureStore so the
 * session survives restarts. Swap `MockAuthProvider` for an OAuth / OIDC client
 * against `endpoints.auth` to go live.
 */

export interface AuthSession {
  token: string;
  user: UserProfile;
}

const DEMO_USER: UserProfile = {
  id: 'usr_demo',
  fullName: 'Eva Kučerová',
  email: 'eva.kucerova@example.sk',
  phone: '+421 903 118 442',
  initials: 'EK',
  cityCardVerified: true,
  discount: 'student',
  language: 'sk',
};

interface AuthProvider {
  signIn(email: string, name?: string): Promise<AuthSession>;
  restore(): Promise<AuthSession | null>;
  signOut(): Promise<void>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

class MockAuthProvider implements AuthProvider {
  async signIn(email: string, name?: string): Promise<AuthSession> {
    await delay(600);
    const token = `mock.${createReference('TKN')}.${createId('s')}`;
    const fullName = name?.trim() || DEMO_USER.fullName;
    const user: UserProfile = {
      ...DEMO_USER,
      fullName,
      initials: initialsFromName(fullName),
      email: email.trim() || DEMO_USER.email,
    };
    await storageService.setSecret(storageKeys.authToken, token);
    await storageService.setJSON(`${storageKeys.authToken}.user`, user);
    return { token, user };
  }

  async restore(): Promise<AuthSession | null> {
    const token = await storageService.getSecret(storageKeys.authToken);
    if (!token) return null;
    const user = await storageService.getJSON<UserProfile | null>(`${storageKeys.authToken}.user`, null);
    return user ? { token, user } : null;
  }

  async signOut(): Promise<void> {
    await storageService.removeSecret(storageKeys.authToken);
    await storageService.remove(`${storageKeys.authToken}.user`);
  }
}

class HttpAuthProvider implements AuthProvider {
  async signIn(): Promise<AuthSession> {
    throw new Error(`Live auth not configured — implement OIDC against ${endpoints.auth}.`);
  }
  async restore(): Promise<AuthSession | null> {
    return null;
  }
  async signOut(): Promise<void> {
    /* noop */
  }
}

const provider: AuthProvider = dataSource.useMockAuth ? new MockAuthProvider() : new HttpAuthProvider();

export const authService = {
  signIn: (email: string, name?: string) => provider.signIn(email, name),
  restoreSession: () => provider.restore(),
  signOut: () => provider.signOut(),
  demoUser: DEMO_USER,
};
