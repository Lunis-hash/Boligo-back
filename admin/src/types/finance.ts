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
  /** null : compte supprimé, paiement conservé anonymisé. */
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    creditBalance: number;
  } | null;
  journey: {
    id: string;
    userA: { firstName: string };
    userB: { firstName: string };
  } | null;
};
