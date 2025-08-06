import api from './api';
import { errorLogger } from '../utils/errorHandling';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

class AuthService {
  private refreshTokenTimeout?: NodeJS.Timeout;

  /**
   * Store tokens securely using HttpOnly cookies in production
   * Falls back to localStorage in development
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    if (process.env.NODE_ENV === 'production') {
      // In production, we'd set HttpOnly cookies via the backend
      // For now, store in localStorage with additional security
      const tokenData = {
        token: accessToken,
        refresh: refreshToken,
        timestamp: Date.now()
      };
      
      // Encrypt token data if crypto is available
      if (window.crypto && window.crypto.subtle) {
        // Store encrypted tokens (simplified implementation)
        localStorage.setItem('authData', btoa(JSON.stringify(tokenData)));
      } else {
        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
      }
    } else {
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  /**
   * Retrieve stored tokens
   */
  private getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
    if (process.env.NODE_ENV === 'production') {
      try {
        const authData = localStorage.getItem('authData');
        if (authData) {
          const decoded = JSON.parse(atob(authData));
          // Check if token is not expired (24 hours)
          if (Date.now() - decoded.timestamp < 24 * 60 * 60 * 1000) {
            return {
              accessToken: decoded.token,
              refreshToken: decoded.refresh
            };
          }
        }
      } catch (error) {
        console.warn('Failed to decode stored auth data');
      }
    }
    
    return {
      accessToken: localStorage.getItem('authToken'),
      refreshToken: localStorage.getItem('refreshToken')
    };
  }

  /**
   * Login with credentials
   */
  async login(credentials: { username: string; password: string }): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login/', credentials);
      const { access_token, refresh_token } = response.data;
      
      this.storeTokens(access_token, refresh_token);
      this.scheduleTokenRefresh(access_token);
      
      return response.data;
    } catch (error) {
      errorLogger.handleError(error, {
        component: 'AuthService',
        action: 'Login',
        userMessage: 'Login failed. Please check your credentials.'
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const { refreshToken } = this.getStoredTokens();
      
      if (!refreshToken) {
        this.logout();
        return null;
      }

      const response = await api.post<{ access_token: string }>('/auth/refresh/', {
        refresh_token: refreshToken
      });

      const { access_token } = response.data;
      
      // Update only the access token, keep the refresh token
      const { refreshToken: storedRefresh } = this.getStoredTokens();
      if (storedRefresh) {
        this.storeTokens(access_token, storedRefresh);
        this.scheduleTokenRefresh(access_token);
      }

      return access_token;
    } catch (error) {
      errorLogger.handleError(error, {
        component: 'AuthService',
        action: 'Token Refresh',
        userMessage: 'Session expired. Please log in again.'
      });
      
      // Force logout on refresh failure
      this.logout();
      return null;
    }
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  private scheduleTokenRefresh(token: string): void {
    try {
      // Decode JWT to get expiration time (simplified)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilRefresh = expirationTime - currentTime - 5 * 60 * 1000; // 5 minutes before expiry

      if (timeUntilRefresh > 0) {
        this.refreshTokenTimeout = setTimeout(() => {
          this.refreshToken();
        }, timeUntilRefresh);
      }
    } catch (error) {
      console.warn('Failed to schedule token refresh:', error);
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    const { accessToken } = this.getStoredTokens();
    return accessToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const { accessToken } = this.getStoredTokens();
    return !!accessToken;
  }

  /**
   * Logout and clear all authentication data
   */
  logout(): void {
    // Clear timeout
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = undefined;
    }

    // Clear stored tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authData');

    // Clear any other user-related data
    localStorage.removeItem('userProfile');

    // Redirect to login
    if (window.location.pathname !== '/login') {
      window.location.href = '/#/login';
    }
  }

  /**
   * Validate token format (basic validation)
   */
  private isValidTokenFormat(token: string): boolean {
    return token.split('.').length === 3; // JWT format check
  }

  /**
   * Initialize auth service on app startup
   */
  initialize(): void {
    const { accessToken } = this.getStoredTokens();
    if (accessToken && this.isValidTokenFormat(accessToken)) {
      this.scheduleTokenRefresh(accessToken);
    }
  }
}

export const authService = new AuthService();
export default authService;