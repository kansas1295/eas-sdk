import {
  Addressable,
  BaseContract,
  ContractFactory,
  ContractRunner,
  ContractTransaction,
  TransactionReceipt,
  TransactionRequest
} from 'ethers';

export interface TransactionSigner extends Addressable {
  estimateGas: (tx: TransactionRequest) => Promise<bigint>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendTransaction: (tx: TransactionRequest) => Promise<any>;
  call: (tx: TransactionRequest) => Promise<string>;
  resolveName: (name: string) => Promise<null | string>;
}

export class Transaction<T> {
  public readonly data: ContractTransaction;
  private readonly signer: TransactionSigner;
  private readonly waitCallback: (receipt: TransactionReceipt) => Promise<T>;

  constructor(
    data: ContractTransaction,
    signer: TransactionSigner,
    waitCallback: (receipt: TransactionReceipt) => Promise<T>
  ) {
    this.data = data;
    this.signer = signer;
    this.waitCallback = waitCallback;
  }

  public async wait(confirmations?: number): Promise<T> {
    const tx = await this.signer.sendTransaction(this.data);
    const receipt = await tx.wait(confirmations);
    if (!receipt) {
      throw new Error(`Unable to confirm: ${tx}`);
    }

    return this.waitCallback(receipt);
  }
}

export class Base<C extends BaseContract> {
  public contract: C;
  protected signer?: TransactionSigner;

  constructor(factory: ContractFactory, address: string, signer?: TransactionSigner) {
    this.contract = factory.attach(address) as C;
    if (signer) {
      this.connect(signer);

      this.signer = signer;
    }
  }

  // Connects the API to a specific signer
  public connect(signer: TransactionSigner) {
    this.contract = this.contract.connect(signer as unknown as ContractRunner) as C;

    return this;
  }

  // Gets the chain ID
  public async getChainId(): Promise<bigint> {
    const provider = this.contract.runner?.provider;
    if (!provider) {
      throw new Error("Unable to get the chain ID: provider wasn't set");
    }

    return (await provider.getNetwork()).chainId;
  }
}
