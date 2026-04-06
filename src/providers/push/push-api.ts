import { BaseApi, IBaseApiConfig } from '../../lib/api-base';

export class PushApi extends BaseApi {
  constructor(config: IBaseApiConfig) {
    super({ ...config, requireOrgId: true });
  }

  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    return this.fetchJson('push/vapid-public-key');
  }

  async subscribe(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent: string
  ): Promise<void> {
    await this.fetchJson('push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent,
      }),
    });
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.fetchJson('push/unsubscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    });
  }

}
