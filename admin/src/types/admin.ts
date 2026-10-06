export type DashboardStats = {
  users: {
    total: number;
    active: number;
    suspended: number;
    newThisWeek: number;
    newToday: number;
    byStatus: { accountStatus: string; _count: { id: number } }[];
  };
  interviews: { completed: number; inProgress: number };
  matching: {
    proposalsTotal: number;
    pending: number;
    accepted: number;
  };
  journeys: {
    total: number;
    inProgress: number;
    successful: number;
    byStep: { currentStep: string; _count: { id: number } }[];
  };
  moderation: {
    reportsPending: number;
    messagesBlocked: number;
    messagesTotal: number;
  };
  credits: { totalBalance: number };
  video: { sessionsCompleted: number };
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  city: string | null;
  gender: string;
  accountStatus: string;
  creditBalance: number;
  isVerified: boolean;
  createdAt: string;
  lastLogin: string | null;
  profile: { profileStatus: string; mainPhoto: string | null; profession: string | null } | null;
  _count: {
    receivedProposals: number;
    targetedProposals: number;
    journeysA: number;
    journeysB: number;
    sentReports: number;
    receivedReports: number;
  };
};

export type MatchRow = {
  id: string;
  compatibilityScore: number;
  status: string;
  proposedAt: string;
  expiresAt: string;
  sourceUser: { id: string; firstName: string; lastName: string; email: string };
  targetUser: { id: string; firstName: string; lastName: string; email: string };
  journey: { id: string; currentStep: string; result: string } | null;
};

export type JourneyRow = {
  id: string;
  currentStep: string;
  result: string;
  createdAt: string;
  userA: { id: string; firstName: string; lastName: string; email: string };
  userB: { id: string; firstName: string; lastName: string; email: string };
  proposal: { compatibilityScore: number; status: string };
  videoSession: { status: string; durationMinutes: number | null } | null;
  _count: { messages: number; harmonyQuestions: number };
};

export type ReportRow = {
  id: string;
  reason: string;
  status: string;
  description: string | null;
  reportedAt: string;
  reporter: { id: string; firstName: string; lastName: string; email: string };
  reported: { id: string; firstName: string; lastName: string; email: string };
  message: { id: string; content: string; sentAt: string } | null;
};
