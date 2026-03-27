export type PackageTier = {
  id: string;
  name: string;
  price: number;
  matchingRatios: number[];
};

export type CompensationSettings = {
  referralPercent: number;
  binaryPercent: number;
};

export type MemberRecord = {
  id: string;
  userId?: string | null;
  name: string;
  phoneNumber?: string | null;
  packageId: string;
  binaryParentId?: string | null;
  binaryPosition?: "LEFT" | "RIGHT" | null;
  rank?: "STARTER" | "FAIR" | "GOOD" | "BETTER" | "BEST" | "COUNCIL";
  councilStatus?: "NONE" | "PENDING" | "APPROVED";
  personalVolume: number;
  directReferralSales: number;
  leftVolume: number;
  rightVolume: number;
  levelSales: number[];
};

export type WalletTransactionRecord = {
  id: string;
  memberId: string;
  memberName: string;
  type: "REFERRAL" | "BINARY" | "MATCH" | "ADJUSTMENT";
  amount: number;
  description: string;
  createdAt: string;
};

export type AuditLogRecord = {
  id: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  createdAt: string;
};

export type WithdrawalRecord = {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  phoneNumber?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note?: string | null;
  payoutReference?: string | null;
  payoutChannel?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};

export type DepositRecord = {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  phoneNumber: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  mpesaReceiptNumber?: string | null;
  merchantRequestId?: string | null;
  checkoutRequestId?: string | null;
  customerMessage?: string | null;
  createdAt: string;
};

export type SupportReplyRecord = {
  id: string;
  userName: string;
  message: string;
  createdAt: string;
};

export type SupportTicketRecord = {
  id: string;
  memberId: string;
  memberName: string;
  subject: string;
  message: string;
  status: "OPEN" | "PENDING" | "CLOSED";
  createdAt: string;
  replies: SupportReplyRecord[];
};

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export type SmsLogRecord = {
  id: string;
  userName?: string | null;
  memberName?: string | null;
  provider: string;
  toPhone: string;
  message: string;
  status: string;
  error?: string | null;
  createdAt: string;
};

export type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category?: string | null;
  price: number;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
};

export type PayoutResult = {
  referralBonus: number;
  binaryBonus: number;
  matchBonus: number;
  totalBonus: number;
};

export const defaultPackages: PackageTier[] = [
  { id: "starter", name: "Starter / Common", price: 50, matchingRatios: [4, 3] },
  { id: "fair", name: "Fair", price: 250, matchingRatios: [5, 3, 1] },
  { id: "good", name: "Good", price: 500, matchingRatios: [5, 3, 2, 1] },
  { id: "better", name: "Better", price: 750, matchingRatios: [5, 3, 2, 1, 1] },
  { id: "best", name: "Best", price: 1000, matchingRatios: [5, 3, 2, 1, 1, 1] },
];

export const defaultSettings: CompensationSettings = {
  referralPercent: 20,
  binaryPercent: 15,
};

export function calculatePayout(
  member: MemberRecord,
  packages: PackageTier[],
  settings: CompensationSettings,
): PayoutResult {
  const tier = packages.find((pkg) => pkg.id === member.packageId);
  const ratios = tier?.matchingRatios ?? [];

  const referralBonus = member.directReferralSales * (settings.referralPercent / 100);
  const binaryBase = Math.min(member.leftVolume, member.rightVolume);
  const binaryBonus = binaryBase * (settings.binaryPercent / 100);

  const matchBonus = ratios.reduce((acc, ratio, idx) => {
    const levelAmount = member.levelSales[idx] ?? 0;
    return acc + levelAmount * (ratio / 100);
  }, 0);

  return {
    referralBonus,
    binaryBonus,
    matchBonus,
    totalBonus: referralBonus + binaryBonus + matchBonus,
  };
}

export function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
