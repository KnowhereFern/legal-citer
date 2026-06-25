import { generateTOTP } from "./pacer-totp";

const TOKEN_TTL_MS = 30 * 60 * 1000;

const AUTH_URLS = {
  qa: "https://qa-login.uscourts.gov",
  prod: "https://pacer.login.uscourts.gov",
};

interface PacerAuthConfig {
  username: string;
  password: string;
  otpSecret?: string;
  qaMode?: boolean;
}

interface AuthResponse {
  nextGenCSO: string;
  loginResult: string;
  errorDescription: string;
}

interface CachedToken {
  token: string;
  timestamp: number;
}

export class PacerAuthManager {
  private username: string;
  private password: string;
  private otpSecret?: string;
  private authUrl: string;
  private cachedToken: CachedToken | null = null;

  constructor(config: PacerAuthConfig) {
    this.username = config.username;
    this.password = config.password;
    this.otpSecret = config.otpSecret;
    this.authUrl = config.qaMode === false ? AUTH_URLS.prod : AUTH_URLS.qa;
  }

  async getToken(): Promise<string> {
    if (this.isTokenValid() && this.cachedToken) {
      return this.cachedToken.token;
    }

    const body: Record<string, string> = {
      loginId: this.username,
      password: this.password,
      redactFlag: "1",
    };

    if (this.otpSecret) {
      body.otpCode = generateTOTP(this.otpSecret);
    }

    const response = await fetch(`${this.authUrl}/services/cso-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `PACER auth request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as AuthResponse;

    if (data.loginResult !== "0") {
      throw new Error(
        `PACER auth failed: ${data.errorDescription || "Unknown error"}`,
      );
    }

    this.cachedToken = {
      token: data.nextGenCSO,
      timestamp: Date.now(),
    };

    return this.cachedToken.token;
  }

  async logout(): Promise<void> {
    if (!this.cachedToken) {
      return;
    }

    try {
      await fetch(`${this.authUrl}/services/cso-logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ nextGenCSO: this.cachedToken.token }),
      });
    } finally {
      this.cachedToken = null;
    }
  }

  isTokenValid(): boolean {
    if (!this.cachedToken) {
      return false;
    }

    return Date.now() - this.cachedToken.timestamp < TOKEN_TTL_MS;
  }
}
