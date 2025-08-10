import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export class GoogleAuthService {
  static clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  
  static scopes = [
    'openid',
    'profile', 
    'email',
    'https://www.googleapis.com/auth/drive.appdata'
  ];

  static async authenticate() {
    try {
      const request = new AuthSession.AuthRequest({
        clientId: this.clientId,
        scopes: this.scopes,
        responseType: AuthSession.ResponseType.Code,
        redirectUri: AuthSession.makeRedirectUri(),
        additionalParameters: {},
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success') {
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: this.clientId,
            code: result.params.code,
            redirectUri: request.redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier,
            },
          },
          discovery
        );

        await this.storeTokens(tokenResult);
        
        return {
          success: true,
          tokens: tokenResult,
          user: await this.getUserInfo(tokenResult.accessToken)
        };
      }

      return { success: false, error: result.type };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserInfo(accessToken) {
    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  static async storeTokens(tokens) {
    try {
      await SecureStore.setItemAsync('google_tokens', JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        issuedAt: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  static async getStoredTokens() {
    try {
      const tokens = await SecureStore.getItemAsync('google_tokens');
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
      return null;
    }
  }

  static async getValidAccessToken() {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens) return null;

      const now = Date.now();
      const expiresAt = tokens.issuedAt + (tokens.expiresIn * 1000);

      if (now >= (expiresAt - 300000)) {
        return await this.refreshAccessToken(tokens.refreshToken);
      }

      return tokens.accessToken;
    } catch (error) {
      console.error('Failed to get valid access token:', error);
      return null;
    }
  }

  static async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v4/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      const newTokens = await response.json();
      
      if (newTokens.access_token) {
        const currentTokens = await this.getStoredTokens();
        const updatedTokens = {
          ...currentTokens,
          accessToken: newTokens.access_token,
          expiresIn: newTokens.expires_in,
          issuedAt: Date.now(),
        };
        
        await this.storeTokens(updatedTokens);
        return newTokens.access_token;
      }

      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  static async signOut() {
    try {
      const tokens = await this.getStoredTokens();
      if (tokens?.accessToken) {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`,
          { method: 'POST' }
        );
      }
      
      await SecureStore.deleteItemAsync('google_tokens');
      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      return false;
    }
  }

  static async isAuthenticated() {
    const tokens = await this.getStoredTokens();
    return tokens !== null;
  }
}