export class MirrorNodeClient {
  private baseUrl: string;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.baseUrl = `https://${network}.mirrornode.hedera.com/api/v1`;
  }

  async getTopicMessages(topicId: string, options: { limit?: number; order?: 'asc' | 'desc'; sequenceNumberGte?: number } = {}): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.order) params.set('order', options.order);
    if (options.sequenceNumberGte) params.set('sequencenumber', `gte:${options.sequenceNumberGte}`);

    const url = `${this.baseUrl}/topics/${topicId}/messages?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    return data.messages?.map((msg: any) => ({
      sequenceNumber: msg.sequence_number,
      timestamp: msg.consensus_timestamp,
      message: JSON.parse(atob(msg.message)),
      runningHash: msg.running_hash,
      topicId: msg.topic_id
    })) || [];
  }

  async getAccountBalance(accountId: string): Promise<{ hbar: number; tokens: any[] }> {
    const url = `${this.baseUrl}/accounts/${accountId}`;
    const response = await fetch(url);
    const data = await response.json();

    return {
      hbar: parseFloat(data.balance?.balance || 0) / 100000000,
      tokens: data.balance?.tokens || []
    };
  }

  async getContractState(contractId: string, slot: string): Promise<string> {
    const url = `${this.baseUrl}/contracts/${contractId}/state?slot=${slot}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.state?.[0]?.value || '0x0';
  }
}
