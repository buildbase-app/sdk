import { IAsset, IDocument } from '../../api/types';
import { BaseApi } from '../../lib/api-base';
import { IOsConfig } from '../../providers/os/types';

interface IScreenDetail {
  title: string;
  description: string;
}

export interface IBetaConfig extends IDocument {
  name: string;
  smallName: string;
  description: string;
  logoFallBack: string;
  logo: string | IAsset;
  privacyPolicy: string;
  termsOfService: string;
  enabled: boolean;
  screen: {
    register: IScreenDetail;
    thankYou: IScreenDetail;
  };
}

interface ApiResponse {
  status: string;
  message: string;
  data?: {
    submissionId: string;
    status: string;
  };
  code: string;
  config?: IBetaConfig;
  submissionId?: string;
}

/** Beta API client (extends BaseApi with basePath 'beta', no auth headers). */
class BetaApi extends BaseApi {
  constructor(config: IOsConfig) {
    super({ ...config, basePath: 'beta', requireOrgId: true });
  }

  protected override getAuthHeaders(): Record<string, string> {
    return {}; // Beta endpoints are unauthenticated
  }

  async fetchConfig(): Promise<IBetaConfig> {
    return this.fetchJson<IBetaConfig>(
      `config?orgId=${encodeURIComponent(this.orgId!)}`,
      {},
      'Failed to fetch beta form configuration'
    );
  }

  async submitBetaUser(payload: {
    orgId: string;
    formData: {
      name: string;
      email: string;
      country?: string;
      language?: string;
      timezone?: string;
      currency?: string;
      context?: Record<string, string | undefined>;
    };
  }): Promise<ApiResponse> {
    return this.fetchJson<ApiResponse>(
      'submit',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      'Failed to submit beta user request'
    );
  }
}

export class BetaForm {
  private api: BetaApi;
  private orgId: string;

  constructor(config: IOsConfig) {
    this.api = new BetaApi(config);
    this.orgId = config.orgId;
  }

  async fetchConfig(): Promise<IBetaConfig> {
    return this.api.fetchConfig();
  }

  async submitBetaUser(formData: {
    name: string;
    email: string;
    context?: {
      country?: string;
      language?: string;
      timezone?: string;
      currency?: string;
    };
  }): Promise<ApiResponse> {
    const context = formData?.context ?? {};
    const country =
      context?.country ??
      (typeof navigator !== 'undefined' && navigator.language
        ? navigator.language.split('-')[1]
        : undefined);
    const language =
      context?.language ??
      (typeof navigator !== 'undefined' && navigator.language
        ? navigator.language.split('-')[0]
        : undefined);
    const timezone =
      context?.timezone ??
      (typeof Intl !== 'undefined' && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined);
    const currency =
      context?.currency ??
      (typeof Intl !== 'undefined' &&
      Intl.NumberFormat &&
      Intl.NumberFormat().resolvedOptions().currency
        ? Intl.NumberFormat().resolvedOptions().currency
        : undefined);

    return this.api.submitBetaUser({
      orgId: this.orgId,
      formData: {
        ...formData,
        country,
        language,
        timezone,
        currency,
      },
    });
  }
}

// Export the BetaForm class as the default export for compatibility with various module systems
export default BetaForm;
