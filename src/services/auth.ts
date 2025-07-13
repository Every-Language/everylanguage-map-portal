import { supabase } from './supabase';
import type { User } from '../types';

export interface AuthResponse {
  user: User | null;
  error: string | null;
}

export interface AuthError {
  message: string;
  code?: string;
}

export class AuthService {
  /**
   * Register a new user with email and password
   */
  async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return {
          user: null,
          error: this.formatError(error),
        };
      }

      return {
        user: data.user as User,
        error: null,
      };
    } catch {
      return {
        user: null,
        error: 'An unexpected error occurred during registration',
      };
    }
  }

  /**
   * Sign in a user with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          user: null,
          error: this.formatError(error),
        };
      }

      return {
        user: data.user as User,
        error: null,
      };
    } catch {
      return {
        user: null,
        error: 'An unexpected error occurred during sign in',
      };
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: 'google' | 'github' | 'discord') {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return {
          user: null,
          error: this.formatError(error),
        };
      }

      // OAuth returns a URL for redirection, not a user object
      return {
        user: null,
        error: null,
      };
    } catch {
      return {
        user: null,
        error: 'An unexpected error occurred during OAuth sign in',
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: this.formatError(error) };
      }

      return { error: null };
    } catch {
      return { error: 'An unexpected error occurred during sign out' };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { error: this.formatError(error) };
      }

      return { error: null };
    } catch {
      return { error: 'An unexpected error occurred while sending reset email' };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(password: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return { error: this.formatError(error) };
      }

      return { error: null };
    } catch {
      return { error: 'An unexpected error occurred while updating password' };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user as User;
    } catch (err) {
      console.error('Error getting current user:', err);
      return null;
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (err) {
      console.error('Error getting current session:', err);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session !== null;
  }

  /**
   * Format Supabase auth errors into user-friendly messages
   */
  private formatError(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'User already registered':
        return 'An account with this email already exists. Please sign in instead.';
      case 'Email not confirmed':
        return 'Please check your email and click the confirmation link to activate your account.';
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long.';
      case 'Invalid email':
        return 'Please enter a valid email address.';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }
}

export const authService = new AuthService(); 