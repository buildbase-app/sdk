import { IAsset, IDocument } from '../../api/types';
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

export class BetaForm {
  private version: string;
  private orgId: string;
  private serverUrl: string;

  constructor(config: IOsConfig) {
    this.version = config.version;
    this.orgId = config.orgId;
    this.serverUrl = config.serverUrl;
  }

  async fetchConfig(): Promise<IBetaConfig> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/beta/config?orgId=${this.orgId}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch beta form configuration: ${response.statusText}`);
    }
    return response.json();
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
    // get the data from browser and intl
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

    const response = await fetch(`${this.serverUrl}/${this.version}/beta/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orgId: this.orgId,
        formData: {
          ...formData,
          country,
          language,
          timezone,
          currency,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit beta user request: ${response.statusText}`);
    }
    return response.json();
  }
}

// Export the BetaForm class as the default export for compatibility with various module systems
export default BetaForm;
