import { Client, TopicMessageSubmitTransaction, PrivateKey } from '@hashgraph/sdk';

export class HCSClient {
  private client: Client;
  private operatorId: string;

  constructor(accountId: string, privateKey: string, network: 'mainnet' | 'testnet' = 'testnet') {
    this.client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
    this.client.setOperator(accountId, PrivateKey.fromString(privateKey));
    this.operatorId = accountId;
  }

  async publishToTopic(topicId: string, message: object): Promise<string> {
    const messageJson = JSON.stringify(message);
    
    const submitTx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(messageJson);

    const response = await submitTx.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    return `${receipt.topicSequenceNumber}`;
  }

  async getTopicMessages(topicId: string, sequenceNumberGte: number = 0): Promise<any[]> {
    const network = this.client.network === Client.forMainnet().network ? 'mainnet' : 'testnet';
    const url = `https://${network}.mirrornode.hedera.com/api/v1/topics/${topicId}/messages`;
    
    const response = await fetch(url + `?limit=100&order=asc&sequencenumber=gte:${sequenceNumberGte}`);
    const data = await response.json();
    
    return data.messages?.map((msg: any) => ({
      sequenceNumber: msg.sequence_number,
      timestamp: msg.consensus_timestamp,
      message: JSON.parse(Buffer.from(msg.message, 'base64').toString()),
      runningHash: msg.running_hash,
      topicId: msg.topic_id
    })) || [];
  }
}
