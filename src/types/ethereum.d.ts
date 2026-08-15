type EthereumRequest = { method: string; params?: readonly unknown[] | object };

interface EthereumProvider {
  isMetaMask?: boolean;
  request<T = unknown>(args: EthereumRequest): Promise<T>;
  on(event: "accountsChanged" | "chainChanged", listener: (...args: unknown[]) => void): void;
  removeListener(event: "accountsChanged" | "chainChanged", listener: (...args: unknown[]) => void): void;
}

interface Window {
  ethereum?: EthereumProvider;
}
