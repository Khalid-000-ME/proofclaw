import { Client, PrivateKey } from '@hashgraph/sdk';

export function createHederaClient(
  accountId: string,
  privateKey: string,
  network: 'mainnet' | 'testnet' = 'testnet'
): Client {
  const client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(accountId, PrivateKey.fromString(privateKey));
  return client;
}

export function getNetworkFromEnv(): 'mainnet' | 'testnet' {
  return process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
}
