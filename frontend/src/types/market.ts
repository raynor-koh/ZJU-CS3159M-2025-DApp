export type Option = {
  id: string;
  label: string;
  price: number; // ticket price (user-defined for now)
  volume: number; // derived: number of tickets * price
  tickets: number; // how many purchased
};

export type Market = {
  id: string;
  title: string;
  description?: string;
  oracle: string; // public verifier label/email/etc
  prizePool: number; // total pool funded by verifier
  options: Option[];
  status: "open" | "resolved";
  resolvedOptionId?: string;
  createdAt: number;
};

export type Ticket = {
  id: string;
  marketId: string;
  optionId: string;
  buyer: string; // placeholder wallet/email
  createdAt: number;
};
