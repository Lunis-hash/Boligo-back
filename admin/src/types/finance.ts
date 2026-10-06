export type FinanceStats = {
  revenue: {
    totalEur: number;
    monthEur: number;
    weekEur: number;
    purchasesCount: number;
    purchasesMonthCount: number;
  };
  credits: {
    sold: number;
    spent: number;
    refunded: number;
    inCirculation: number;
    consumptionsCount: number;
    refundsCount: number;
  };
  transactionsTotal: number;
  byType: {
    type: string;
    _count: { id: number };
    _sum: { euroAmount: number | null; creditAmount: number | null };
  }[];
  note: string;
};

export type TransactionRow = {
  id: string;
  type: string;
  creditAmount: number;
  euroAmount: number | null;
  paymentRef: string | null;
  date: string;
  description: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    creditBalance: number;
  };
  journey: {
    id: string;
    userA: { firstName: string };
    userB: { firstName: string };
  } | null;
};
