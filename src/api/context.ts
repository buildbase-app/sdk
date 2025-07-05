import { AuthUser } from '../providers/auth';

export interface IAuth {
  clientId: string;
  redirectUrl: string;
  onAuthStateChange?: (user: AuthUser | null) => void;
}

export class Context {
  private serverUrl: string;
  private version: string;
  private orgId: string;

  private auth: IAuth;

  private static VALID_VERSIONS: string[] = ['v1'];

  constructor(serverUrl: string, version: string, orgId: string, auth?: IAuth) {
    version = String(version).trim();
    orgId = String(orgId).trim();
    if (!serverUrl) {
      throw new Error('serverUrl is required to initialize Context.');
    }
    if (!version) {
      throw new Error('version is required to initialize Context.');
    }
    if (!orgId) {
      throw new Error('orgId is required to initialize Context.');
    }

    // Validate that the URL is a valid HTTPS URL
    try {
      const url = new URL(serverUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('serverUrl must be a valid HTTPS URL.');
      }
    } catch (e) {
      throw new Error('serverUrl must be a valid HTTPS URL.');
    }
    // Validate that the version is valid
    if (Context.VALID_VERSIONS.indexOf(version) === -1) {
      throw new Error(
        `Invalid API version. Valid versions are: ${Context.VALID_VERSIONS.join(', ')}.`
      );
    }
    // Remove trailing slash if any
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.version = version;
    this.orgId = orgId;
    this.auth = auth || { clientId: '', redirectUrl: '', onAuthStateChange: undefined };
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  getVersion(): string {
    return this.version;
  }

  getOrgId(): string {
    return this.orgId;
  }

  getAuth(): IAuth {
    return this.auth;
  }
}
