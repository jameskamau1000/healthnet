"use client";

import Image from "next/image";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { PublicMarketing } from "@/components/public-marketing";
import {
  AuditLogRecord,
  calculatePayout,
  CompensationSettings,
  DepositRecord,
  defaultPackages,
  defaultSettings,
  MemberRecord,
  money,
  NotificationRecord,
  PackageTier,
  ProductRecord,
  SmsLogRecord,
  SupportTicketRecord,
  WithdrawalRecord,
  WalletTransactionRecord,
} from "@/lib/compensation";

type TabId =
  | "overview"
  | "tree"
  | "myReferrer"
  | "referrerCommission"
  | "binaryCommission"
  | "products"
  | "plans"
  | "packages"
  | "simulator"
  | "members"
  | "deposits"
  | "withdrawals"
  | "transactions"
  | "reconciliation"
  | "support"
  | "notifications"
  | "sms"
  | "audit"
  | "settings";
type Role = "ADMIN" | "MEMBER";
type User = { id: string; email: string; name: string; role: Role };
type DashboardResponse = {
  user: User;
  settings: CompensationSettings;
  packages: PackageTier[];
  products: ProductRecord[];
  members: MemberRecord[];
  deposits: DepositRecord[];
  transactions: WalletTransactionRecord[];
  auditLogs: AuditLogRecord[];
  withdrawals: WithdrawalRecord[];
  supportTickets: SupportTicketRecord[];
  notifications: NotificationRecord[];
  notificationUnreadCount: number;
  smsLogs: SmsLogRecord[];
};
type ReferralTreeNode = {
  id: string;
  memberId: string | null;
  parentMemberId: string | null;
  position: "LEFT" | "RIGHT" | null;
  depth: number;
  name: string;
  email: string | null;
  referralCode: string | null;
  packageName: string | null;
  rank: string | null;
  councilStatus: string | null;
  isPlaceholder: boolean;
  createdAt: string;
};
type DirectReferralRow = {
  id: string;
  name: string;
  email: string;
  packageName: string | null;
  rank: string | null;
  joinedAt: string;
};

const tabOrder: TabId[] = [
  "overview",
  "tree",
  "myReferrer",
  "referrerCommission",
  "binaryCommission",
  "products",
  "plans",
  "packages",
  "simulator",
  "members",
  "deposits",
  "withdrawals",
  "transactions",
  "reconciliation",
  "support",
  "notifications",
  "sms",
  "audit",
  "settings",
];
const tabLabels: Record<TabId, string> = {
  overview: "Overview",
  tree: "My Tree",
  myReferrer: "My Referrer",
  referrerCommission: "Referrer Commission",
  binaryCommission: "Binary Commission",
  products: "Products",
  plans: "Plans",
  packages: "Packages",
  simulator: "Simulator",
  members: "Members",
  deposits: "Deposits",
  withdrawals: "Withdrawals",
  transactions: "Transactions",
  reconciliation: "Reconciliation",
  support: "Support",
  notifications: "Notifications",
  sms: "SMS Logs",
  audit: "Audit Log",
  settings: "Comp Settings",
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [defaultAdminHint, setDefaultAdminHint] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhoneNumber, setRegPhoneNumber] = useState("");
  const [regPackageId, setRegPackageId] = useState("starter");
  const [regReferralCode, setRegReferralCode] = useState("");
  const [regPosition, setRegPosition] = useState<"left" | "right">("left");

  const [packages, setPackages] = useState<PackageTier[]>(defaultPackages);
  const [settings, setSettings] = useState<CompensationSettings>(defaultSettings);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [transactions, setTransactions] = useState<WalletTransactionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicketRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [smsLogs, setSmsLogs] = useState<SmsLogRecord[]>([]);
  const [treeNodes, setTreeNodes] = useState<ReferralTreeNode[]>([]);
  const [treeDirectReferrals, setTreeDirectReferrals] = useState(0);
  const [treeTotalDownline, setTreeTotalDownline] = useState(0);
  const [treeDirectRows, setTreeDirectRows] = useState<DirectReferralRow[]>([]);
  const [referralLinks, setReferralLinks] = useState<{ leftLink: string; rightLink: string } | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawPhoneNumber, setWithdrawPhoneNumber] = useState("");
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositPhoneNumber, setDepositPhoneNumber] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawalChallengeId, setWithdrawalChallengeId] = useState<string | null>(null);
  const [withdrawalOtpCode, setWithdrawalOtpCode] = useState("");
  const [withdrawalBusy, setWithdrawalBusy] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [recon, setRecon] = useState({
    pendingStkOlderThan10Min: 0,
    failedDeposits: 0,
    pendingWithdrawals: 0,
    approvedWithdrawalsMissingPayoutMeta: 0,
  });
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [replyMessageByTicket, setReplyMessageByTicket] = useState<Record<string, string>>({});

  const [newName, setNewName] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [newProductDescription, setNewProductDescription] = useState("");
  const [purchaseBusyId, setPurchaseBusyId] = useState<string | null>(null);
  const [registerAlert, setRegisterAlert] = useState<{ variant: "success" | "error"; message: string } | null>(
    null,
  );
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const registerPanelRef = useRef<HTMLDivElement | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const [landingProducts, setLandingProducts] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
      description: string;
      category: string | null;
      price: number;
      imageUrl: string | null;
    }>
  >([]);

  const heroSlides = useMemo(
    () => [
      {
        kicker: "Welcome to Ayur Health International",
        title: "Mother Nature & You",
        subtitle: "Healing beyond science — holistic wellness and member rewards.",
        gradient: "from-[#14532d] via-[#15803d] to-[#0f172a]",
      },
      {
        kicker: "Welcome to Ayur Health International",
        title: "Transparent rewards",
        subtitle: "Referral, binary, and match bonuses with full traceability.",
        gradient: "from-[#0f172a] via-[#14532d] to-[#15803d]",
      },
      {
        kicker: "Welcome to Ayur Health International",
        title: "Built for growth",
        subtitle: "M-Pesa flows, payouts, and support in one trusted platform.",
        gradient: "from-[#15803d] via-[#0f172a] to-[#14532d]",
      },
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.products) {
          setLandingProducts(data.products);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user) return;
    const id = window.setInterval(
      () =>
        setHeroSlide((i) =>
          heroSlides.length === 0 ? 0 : (i + 1) % heroSlides.length,
        ),
      6000,
    );
    return () => window.clearInterval(id);
  }, [user, heroSlides.length]);

  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newPackageId, setNewPackageId] = useState(defaultPackages[0].id);
  const [newReferralSales, setNewReferralSales] = useState(0);
  const [newLeftVolume, setNewLeftVolume] = useState(0);
  const [newRightVolume, setNewRightVolume] = useState(0);

  const [simPackageId, setSimPackageId] = useState(defaultPackages[0].id);
  const [simReferralSales, setSimReferralSales] = useState(0);
  const [simLeftVolume, setSimLeftVolume] = useState(0);
  const [simRightVolume, setSimRightVolume] = useState(0);
  const [simLevelSales, setSimLevelSales] = useState<number[]>(
    new Array(defaultPackages[0].matchingRatios.length).fill(0),
  );

  const isAdmin = user?.role === "ADMIN";
  const visibleTabs = useMemo(
    () =>
      isAdmin
        ? tabOrder
        : ([
            "overview",
            "tree",
            "myReferrer",
            "referrerCommission",
            "binaryCommission",
            "products",
            "plans",
            "simulator",
            "members",
            "deposits",
            "transactions",
            "withdrawals",
            "support",
            "notifications",
            "sms",
          ] as TabId[]),
    [isAdmin],
  );
  const packageMap = useMemo(
    () => new Map(packages.map((pkg) => [pkg.id, pkg])),
    [packages],
  );
  const selectedSimPackage = packageMap.get(simPackageId) ?? packages[0];
  const simRatios = selectedSimPackage.matchingRatios;

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      const position = params.get("position");
      if (ref) setRegReferralCode(ref);
      if (position === "left" || position === "right") setRegPosition(position);

      setLoading(true);
      try {
        const me = await fetch("/api/auth/me");
        const meData = await me.json();
        if (!me.ok) {
          setError(meData.error ?? "Failed to initialize");
          return;
        }
        if (meData.user) {
          await loadDashboard();
        } else {
          const hint =
            meData.defaultAdmin?.email && meData.defaultAdmin?.password
              ? `Local dev admin: ${meData.defaultAdmin.email} / ${meData.defaultAdmin.password}`
              : null;
          setDefaultAdminHint(hint);
          setNotice(hint);
        }
      } catch {
        setError("Could not connect to backend");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [activeTab, visibleTabs]);

  const memberRows = useMemo(
    () =>
      members.map((member) => {
        const payout = calculatePayout(member, packages, settings);
        const tier = packageMap.get(member.packageId);
        return { member, payout, tier };
      }),
    [members, packages, settings, packageMap],
  );
  const totals = useMemo(
    () =>
      memberRows.reduce(
        (acc, row) => {
          acc.totalSales += row.tier?.price ?? 0;
          acc.totalReferral += row.payout.referralBonus;
          acc.totalBinary += row.payout.binaryBonus;
          acc.totalMatch += row.payout.matchBonus;
          return acc;
        },
        { totalSales: 0, totalReferral: 0, totalBinary: 0, totalMatch: 0 },
      ),
    [memberRows],
  );

  const simPayout = calculatePayout(
    {
      id: "sim",
      name: "Simulation",
      packageId: simPackageId,
      personalVolume: 0,
      directReferralSales: simReferralSales,
      leftVolume: simLeftVolume,
      rightVolume: simRightVolume,
      levelSales: simLevelSales,
    },
    packages,
    settings,
  );
  const currentMember = useMemo(
    () => members.find((member) => member.userId === user?.id) ?? (user?.role === "MEMBER" ? members[0] : null),
    [members, user],
  );

  const bvByPackageId = useMemo(
    () => ({
      starter: 20,
      fair: 40,
      good: 80,
      better: 120,
      best: 160,
    }),
    [],
  );

  useEffect(() => {
    const needsTree = activeTab === "tree" || activeTab === "myReferrer";
    if (!user || !needsTree || treeLoading || treeNodes.length > 0) return;
    const run = async () => {
      setTreeLoading(true);
      try {
        const response = await fetch("/api/member/tree");
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Failed to load referral tree");
          return;
        }
        setTreeNodes(data.nodes ?? []);
        setTreeDirectReferrals(data.directReferralsCount ?? 0);
        setTreeTotalDownline(data.totalDownline ?? 0);
        setTreeDirectRows(data.directReferrals ?? []);
      } catch {
        setError("Failed to load referral tree");
      } finally {
        setTreeLoading(false);
      }
    };
    run();
  }, [activeTab, treeLoading, treeNodes.length, user]);
  useEffect(() => {
    if (!user || activeTab !== "tree" || referralLinks) return;
    const run = async () => {
      try {
        const response = await fetch("/api/member/referral-links");
        const data = await response.json();
        if (!response.ok) return;
        setReferralLinks({
          leftLink: data.leftLink,
          rightLink: data.rightLink,
        });
      } catch {
        // non-blocking helper section
      }
    };
    run();
  }, [activeTab, referralLinks, user]);
  const referrerCommissionRows = useMemo(() => {
    const sorted = [...transactions]
      .filter((tx) => tx.type === "REFERRAL")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let running = 0;
    return sorted.map((tx, index) => {
      running += tx.amount;
      return { ...tx, sl: index + 1, afterBalance: running };
    });
  }, [transactions]);
  const binaryCommissionRows = useMemo(() => {
    const sorted = [...transactions]
      .filter((tx) => tx.type === "BINARY")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let running = 0;
    return sorted.map((tx, index) => {
      running += tx.amount;
      return { ...tx, sl: index + 1, afterBalance: running };
    });
  }, [transactions]);
  const treeGraph = useMemo(() => {
    const root = treeNodes.find((node) => node.depth === 0);
    if (!root) return { nodes: [], edges: [], maxDepth: 0 };

    const memberIndex = new Map<string, number>();
    if (root.memberId) {
      memberIndex.set(root.memberId, 1);
    }

    const graphNodes: Array<
      ReferralTreeNode & {
        graphIndex: number;
        x: number;
        y: number;
      }
    > = [];

    const sorted = [...treeNodes].sort((a, b) => a.depth - b.depth);
    for (const node of sorted) {
      if (node.depth === 0) {
        graphNodes.push({
          ...node,
          graphIndex: 1,
          x: 0,
          y: 0,
        });
        continue;
      }
      if (!node.parentMemberId || !node.position) continue;

      const parentIndex = memberIndex.get(node.parentMemberId);
      if (!parentIndex) continue;

      const graphIndex = node.position === "LEFT" ? parentIndex * 2 : parentIndex * 2 + 1;
      if (node.memberId) {
        memberIndex.set(node.memberId, graphIndex);
      }

      graphNodes.push({
        ...node,
        graphIndex,
        x: 0,
        y: 0,
      });
    }

    const maxDepth = Math.max(...graphNodes.map((node) => node.depth), 0);
    const width = Math.max(1200, 2 ** maxDepth * 120);
    const nodeRadius = 34;
    const yGap = 150;

    const positioned = graphNodes.map((node) => {
      const levelStart = 2 ** node.depth;
      const levelOffset = node.graphIndex - levelStart;
      const slots = 2 ** node.depth;
      const x = ((levelOffset + 0.5) / slots) * width;
      const y = 70 + node.depth * yGap;
      return { ...node, x, y };
    });

    const byGraphIndex = new Map(positioned.map((node) => [node.graphIndex, node]));
    const edges = positioned
      .filter((node) => node.depth > 0)
      .flatMap((node) => {
        const parent = byGraphIndex.get(Math.floor(node.graphIndex / 2));
        if (!parent) return [];
        const midY = (parent.y + node.y) / 2;
        return [
          {
            id: `${parent.graphIndex}-${node.graphIndex}`,
            points: `${parent.x},${parent.y + nodeRadius} ${parent.x},${midY} ${node.x},${midY} ${node.x},${node.y - nodeRadius}`,
          },
        ];
      });

    return {
      nodes: positioned,
      edges,
      maxDepth,
      width,
      height: 140 + maxDepth * yGap,
      nodeRadius,
    };
  }, [treeNodes]);

  function treeRingColor(node: ReferralTreeNode): string {
    if (node.isPlaceholder) return "#94a3b8";
    const rank = node.rank ?? "";
    if (rank === "BEST") return "#7f1d1d";
    if (rank === "BETTER") return "#c9a227";
    if (rank === "GOOD") return "#15803d";
    if (rank === "FAIR") return "#22c55e";
    return "#15803d";
  }

  async function loadDashboard() {
    const response = await fetch("/api/dashboard");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load dashboard");
    }

    const typed = data as DashboardResponse;
    setUser(typed.user);
    setSettings(typed.settings);
    setPackages(
      typed.packages.map((pkg) => ({ ...pkg, matchingRatios: (pkg.matchingRatios as number[]) ?? [] })),
    );
    setProducts(typed.products ?? []);
    setMembers(
      typed.members.map((member) => ({
        ...member,
        personalVolume: member.personalVolume ?? 0,
        levelSales: (member.levelSales as number[]) ?? [],
      })),
    );
    setDeposits(typed.deposits ?? []);
    setTransactions(typed.transactions ?? []);
    setAuditLogs(typed.auditLogs ?? []);
    setWithdrawals(typed.withdrawals ?? []);
    setSupportTickets(typed.supportTickets ?? []);
    setNotifications(typed.notifications ?? []);
    setNotificationUnreadCount(typed.notificationUnreadCount ?? 0);
    setSmsLogs(typed.smsLogs ?? []);
    setTreeNodes([]);
    setTreeDirectReferrals(0);
    setTreeTotalDownline(0);
    setTreeDirectRows([]);
    setReferralLinks(null);

    if (typed.user.role === "MEMBER") {
      const res = await fetch("/api/member/withdrawals");
      if (res.ok) {
        const memberData = await res.json();
        setWithdrawals(memberData.withdrawals ?? []);
        setAvailableBalance(memberData.availableBalance ?? 0);
      }
    } else {
      setAvailableBalance(0);
      const reconResponse = await fetch("/api/admin/reconciliation");
      if (reconResponse.ok) {
        const reconData = await reconResponse.json();
        setRecon(reconData);
      }
    }
  }

  async function onPurchaseProduct(productId: string) {
    if (!user || user.role !== "MEMBER") return;
    setPurchaseBusyId(productId);
    setError(null);
    try {
      const response = await fetch("/api/member/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Purchase failed");
        return;
      }
      setNotice(
        `Purchase recorded: +${money(data.bv ?? 0)} BV & PV — ${data.productName ?? "product"}. Upline commissions applied.`,
      );
      await loadDashboard();
    } catch {
      setError("Purchase could not complete");
    } finally {
      setPurchaseBusyId(null);
    }
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Login failed");
      return;
    }
    await loadDashboard();
  }

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setRegisterAlert(null);
    setRegisterSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          phoneNumber: regPhoneNumber || undefined,
          packageId: regPackageId,
          referralCode: regReferralCode || undefined,
          position: regReferralCode ? regPosition : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRegisterAlert({
          variant: "error",
          message: data.error ?? "Registration failed. Please check your details and try again.",
        });
        return;
      }
      setRegisterAlert({
        variant: "success",
        message: `Registration successful. Welcome, ${data.name}. Your referral code is ${data.referralCode}. You can sign in below or use the Login link.`,
      });
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      setRegPhoneNumber("");
      setRegReferralCode("");
      setRegPosition("left");
    } catch {
      setRegisterAlert({
        variant: "error",
        message: "We could not reach the server. Check your connection and try again.",
      });
    } finally {
      setRegisterSubmitting(false);
      requestAnimationFrame(() => {
        registerPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setLoginEmail("");
    setLoginPassword("");
    setTreeNodes([]);
    setTreeDirectReferrals(0);
    setTreeTotalDownline(0);
    setTreeDirectRows([]);
    setReferralLinks(null);
    setNotice("You have been logged out.");
  }

  async function onAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/comp/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        phoneNumber: newPhoneNumber || undefined,
        packageId: newPackageId,
        directReferralSales: newReferralSales,
        leftVolume: newLeftVolume,
        rightVolume: newRightVolume,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to add member");
      return;
    }
    setNotice(`Created member ${data.name}`);
    setNewName("");
    setNewPhoneNumber("");
    setNewReferralSales(0);
    setNewLeftVolume(0);
    setNewRightVolume(0);
    await loadDashboard();
  }

  async function onAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProductName.trim(),
        category: newProductCategory || undefined,
        description: newProductDescription.trim(),
        price: newProductPrice,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to add product");
      return;
    }
    setNotice(`Created product ${data.name}`);
    setNewProductName("");
    setNewProductCategory("");
    setNewProductPrice(0);
    setNewProductDescription("");
    await loadDashboard();
  }

  async function toggleProductStatus(productId: string, isActive: boolean) {
    const response = await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: productId,
        isActive: !isActive,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to update product");
      return;
    }
    setNotice(`Product ${data.isActive ? "activated" : "hidden"}: ${data.name}`);
    await loadDashboard();
  }

  async function requestPlanUpgrade(targetPackageId: string, targetPackageName: string) {
    if (!currentMember) {
      setError("Member profile not found");
      return;
    }
    if (currentMember.packageId === targetPackageId) {
      setNotice(`You already have ${targetPackageName}.`);
      return;
    }

    const response = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Plan upgrade request",
        message: `Please upgrade my plan from ${currentMember.packageId} to ${targetPackageId} (${targetPackageName}).`,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Upgrade request failed");
      return;
    }
    setNotice(`Upgrade request for ${targetPackageName} submitted.`);
    await loadDashboard();
  }

  async function approveCouncil(memberId: string) {
    const response = await fetch("/api/admin/council", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Council approval failed");
      return;
    }
    setNotice("Council status approved.");
    await loadDashboard();
  }

  async function requestWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setWithdrawalBusy(true);
    try {
      if (withdrawalChallengeId) {
        const verifyRes = await fetch("/api/member/withdrawals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: withdrawalChallengeId,
            otpCode: withdrawalOtpCode.trim(),
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          setError(verifyData.error ?? "OTP verification failed");
          return;
        }
        setNotice("Withdrawal request submitted.");
        setWithdrawalChallengeId(null);
        setWithdrawalOtpCode("");
        setWithdrawAmount(0);
        setWithdrawPhoneNumber("");
        setWithdrawNote("");
        await loadDashboard();
        return;
      }

      const response = await fetch("/api/member/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: withdrawAmount,
          phoneNumber: withdrawPhoneNumber,
          note: withdrawNote || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Withdrawal request failed");
        return;
      }
      if (data.otpRequired && data.challengeId) {
        setWithdrawalChallengeId(data.challengeId);
        setWithdrawalOtpCode("");
        setNotice("OTP sent to your email. Enter the code below to confirm withdrawal.");
        return;
      }
      setNotice("Withdrawal request submitted.");
      setWithdrawAmount(0);
      setWithdrawPhoneNumber("");
      setWithdrawNote("");
      await loadDashboard();
    } finally {
      setWithdrawalBusy(false);
    }
  }

  async function requestDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/member/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: depositAmount,
        phoneNumber: depositPhoneNumber,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Deposit request failed");
      return;
    }
    setNotice("STK push sent to your phone. Complete payment to credit your wallet.");
    setDepositAmount(0);
    setDepositPhoneNumber("");
    await loadDashboard();
  }

  async function createSupportTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: supportSubject, message: supportMessage }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Ticket creation failed");
      return;
    }
    setNotice("Support ticket created.");
    setSupportSubject("");
    setSupportMessage("");
    await loadDashboard();
  }

  async function updateTicketStatus(ticketId: string, status: "OPEN" | "PENDING" | "CLOSED") {
    const response = await fetch("/api/support/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, status }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Ticket status update failed");
      return;
    }
    setNotice("Ticket status updated.");
    await loadDashboard();
  }

  async function sendTicketReply(ticketId: string) {
    const message = replyMessageByTicket[ticketId]?.trim();
    if (!message) return;
    const response = await fetch("/api/support/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, message }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Reply failed");
      return;
    }
    setReplyMessageByTicket((prev) => ({ ...prev, [ticketId]: "" }));
    setNotice("Reply sent.");
    await loadDashboard();
  }

  async function markNotificationRead(notificationId: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to mark notification read");
      return;
    }
    await loadDashboard();
  }

  async function markAllNotificationsRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to mark notifications read");
      return;
    }
    await loadDashboard();
  }

  async function reviewWithdrawal(withdrawalId: string, decision: "APPROVED" | "REJECTED") {
    let payoutReference: string | undefined;
    let payoutChannel: string | undefined;
    if (decision === "APPROVED") {
      payoutReference = window.prompt("Enter payout reference (optional):") ?? undefined;
      payoutChannel = window.prompt("Enter payout channel (optional):", "bank") ?? undefined;
    }

    const response = await fetch("/api/admin/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withdrawalId, decision, payoutReference, payoutChannel }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Withdrawal review failed");
      return;
    }
    setNotice(`Withdrawal ${decision.toLowerCase()} successfully.`);
    await loadDashboard();
  }

  async function saveSettings(next: CompensationSettings) {
    setSettings(next);
    if (!isAdmin) return;
    await fetch("/api/comp/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  async function savePackagePrice(id: string, price: number) {
    const next = packages.map((pkg) => (pkg.id === id ? { ...pkg, price } : pkg));
    setPackages(next);
    if (!isAdmin) return;
    await fetch("/api/comp/packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packages: next }),
    });
  }

  function onSimPackageChange(value: string) {
    setSimPackageId(value);
    const ratios = packageMap.get(value)?.matchingRatios ?? [];
    setSimLevelSales(new Array(ratios.length).fill(0));
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Image
                src="/ayur-health-logo.svg"
                alt="Ayur Health International"
                width={180}
                height={48}
                className="h-10 w-auto"
                priority
              />
              <div className="hidden border-l border-slate-200 pl-4 text-sm text-slate-600 md:block">
                Referral bonus {settings.referralPercent}% | Binary bonus {settings.binaryPercent}%
              </div>
            </div>
            {user ? (
              <div className="text-sm text-slate-700">
                Signed in as {user.name} ({user.role})
              </div>
            ) : (
              <nav className="flex flex-wrap items-center gap-2 text-sm">
                <a
                  href="#features"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Features
                </a>
                <a
                  href="#opportunity"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Get Started
                </a>
                <a
                  href="/login?tab=register"
                  className="rounded-full border border-ayur-gold bg-ayur-gold px-4 py-2 font-semibold text-ayur-maroon hover:bg-ayur-gold/90"
                >
                  Register
                </a>
                <a
                  href="/login"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Login
                </a>
              </nav>
            )}
          </div>
        </div>
      </header>

      <main
        className={
          user
            ? "w-full space-y-6 py-6 pr-6"
            : "w-full space-y-6 py-6"
        }
      >
        {loading && <p className="text-sm text-slate-600">Loading Ayur Health International...</p>}
        {error && <p className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && (user || notice !== defaultAdminHint) && (
          <p className="rounded border border-ayur-gold/30 bg-amber-50/50 p-3 text-sm text-ayur-maroon">{notice}</p>
        )}

        {!loading && !user && (
          <PublicMarketing
            heroSlide={heroSlide}
            setHeroSlide={setHeroSlide}
            heroSlides={heroSlides}
            landingProducts={landingProducts}
            settings={settings}
          />
        )}

        {user && (
          <section className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="h-fit rounded-xl border border-slate-200 bg-white shadow-sm p-3 lg:sticky lg:top-6">
              <p className="px-3 pb-2 text-xs uppercase tracking-wider text-slate-400">Menu</p>
              <div className="space-y-2">
                {visibleTabs.map((tabId) => (
                  <button
                    key={tabId}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      activeTab === tabId
                        ? "bg-ayur-green font-semibold text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    onClick={() => setActiveTab(tabId)}
                  >
                    {tabLabels[tabId]}
                    {tabId === "notifications" && notificationUnreadCount > 0
                      ? ` (${notificationUnreadCount})`
                      : ""}
                  </button>
                ))}
              </div>
              <button
                className="mt-4 w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                onClick={onLogout}
              >
                Logout
              </button>
            </aside>

            <div className="space-y-6">
            {activeTab === "overview" && (
              <section className="space-y-4">
                {isAdmin ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <MetricCard title="Members" value={String(members.length)} />
                    <MetricCard title="Package Sales" value={money(totals.totalSales)} />
                    <MetricCard title="Referral (formula)" value={money(totals.totalReferral)} />
                    <MetricCard title="Binary (formula)" value={money(totals.totalBinary)} />
                    <MetricCard title="Match (formula)" value={money(totals.totalMatch)} />
                  </div>
                ) : currentMember ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Personal volume (PV)" value={money(currentMember.personalVolume ?? 0)} />
                    <MetricCard title="Left leg BV" value={money(currentMember.leftVolume ?? 0)} />
                    <MetricCard title="Right leg BV" value={money(currentMember.rightVolume ?? 0)} />
                    <MetricCard title="Direct team BV" value={money(currentMember.directReferralSales ?? 0)} />
                  </div>
                ) : null}
                {!isAdmin && currentMember && (
                  <article className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                    <p className="font-semibold text-slate-900">How volume works</p>
                    <p className="mt-2">
                      <strong>PV</strong> is your personal volume from your package activation and product purchases.{" "}
                      <strong>BV</strong> flows up your binary legs when you or your team generate qualifying volume.
                      Referral and matching bonuses credit your sponsor; binary pays upline on newly matched leg volume.
                    </p>
                  </article>
                )}
              </section>
            )}

            {activeTab === "tree" && (
              <section className="space-y-4">
                <article className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                  <p className="font-semibold text-slate-900">Binary tree & BV</p>
                  <p className="mt-2">
                    New members join under your left or right referral links. Qualifying volume (package price on
                    registration, product purchases) adds <strong>BV</strong> up each upline leg and triggers referral,
                    binary, and matching payouts per plan rules.
                  </p>
                </article>
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Direct Referrals" value={String(treeDirectReferrals)} />
                  <MetricCard title="Total Downline" value={String(treeTotalDownline)} />
                  <MetricCard
                    title="Tree Depth Loaded"
                    value={String(Math.max(...treeNodes.map((node) => node.depth), 0))}
                  />
                </div>
                <article className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                  <h2 className="mb-4 text-lg font-semibold">Referrer Link</h2>
                  <div className="space-y-3">
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        value={referralLinks?.leftLink ?? "Loading left link..."}
                        readOnly
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                      />
                      <button
                        onClick={async () => {
                          if (!referralLinks?.leftLink) return;
                          await navigator.clipboard.writeText(referralLinks.leftLink);
                          setNotice("Left referral link copied.");
                        }}
                        className="rounded-md bg-ayur-gold px-4 py-2 text-sm font-semibold text-ayur-maroon hover:bg-ayur-gold/90"
                      >
                        Copy left
                      </button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        value={referralLinks?.rightLink ?? "Loading right link..."}
                        readOnly
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                      />
                      <button
                        onClick={async () => {
                          if (!referralLinks?.rightLink) return;
                          await navigator.clipboard.writeText(referralLinks.rightLink);
                          setNotice("Right referral link copied.");
                        }}
                        className="rounded-md bg-ayur-gold px-4 py-2 text-sm font-semibold text-ayur-maroon hover:bg-ayur-gold/90"
                      >
                        Copy right
                      </button>
                    </div>
                  </div>
                </article>
                <article className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                  <h2 className="mb-4 text-lg font-semibold">Binary Tree</h2>
                  {treeLoading && <p className="text-sm text-slate-600">Loading tree...</p>}
                  {!treeLoading && treeNodes.length === 0 && (
                    <p className="text-sm text-slate-600">No referral tree data found yet.</p>
                  )}
                  {!treeLoading && treeGraph.nodes.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <svg
                        width={treeGraph.width}
                        height={treeGraph.height}
                        viewBox={`0 0 ${treeGraph.width} ${treeGraph.height}`}
                        className="mx-auto"
                      >
                        {treeGraph.edges.map((edge) => (
                          <polyline
                            key={edge.id}
                            points={edge.points}
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="2"
                          />
                        ))}
                        {treeGraph.nodes.map((node) => (
                          <g key={node.id}>
                            <circle cx={node.x} cy={node.y} r={(treeGraph.nodeRadius ?? 34) + 3} fill={treeRingColor(node)} />
                            <circle cx={node.x} cy={node.y} r={treeGraph.nodeRadius ?? 34} fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                            <text
                              x={node.x}
                              y={node.y + 4}
                              textAnchor="middle"
                              fill="#334155"
                              fontSize="11"
                              fontWeight="600"
                            >
                              {node.isPlaceholder ? "No" : "Member"}
                            </text>
                            <text
                              x={node.x}
                              y={node.y + (treeGraph.nodeRadius ?? 34) + 18}
                              textAnchor="middle"
                              fill="#0f172a"
                              fontSize="14"
                              fontWeight="600"
                            >
                              {node.depth === 0 ? "You" : node.name}
                            </text>
                            <text
                              x={node.x}
                              y={node.y + (treeGraph.nodeRadius ?? 34) + 36}
                              textAnchor="middle"
                              fill="#64748b"
                              fontSize="12"
                            >
                              {node.position ? node.position : "ROOT"}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  )}
                </article>
              </section>
            )}

            {activeTab === "myReferrer" && (
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <h2 className="mb-3 text-lg font-semibold">My Referrer</h2>
                {treeLoading && <p className="text-sm text-slate-600">Loading referrer data...</p>}
                {!treeLoading && treeDirectRows.length === 0 && (
                  <p className="text-sm text-slate-600">No direct referrals yet.</p>
                )}
                {treeDirectRows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-ayur-maroon/80">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Plan</th>
                          <th className="px-3 py-2">Rank</th>
                          <th className="px-3 py-2">Join date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {treeDirectRows.map((row) => (
                          <tr key={row.id} className="border-t border-slate-200">
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">{row.email}</td>
                            <td className="px-3 py-2">{row.packageName ?? "-"}</td>
                            <td className="px-3 py-2">{row.rank ?? "-"}</td>
                            <td className="px-3 py-2">{new Date(row.joinedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === "referrerCommission" && (
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <h2 className="mb-3 text-lg font-semibold">Referrer Commission</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-ayur-maroon/80">
                      <tr>
                        <th className="px-3 py-2">SL</th>
                        <th className="px-3 py-2">TRX-ID</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Charge</th>
                        <th className="px-3 py-2">After Balance</th>
                        <th className="px-3 py-2">Detail</th>
                        <th className="px-3 py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrerCommissionRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">{row.sl}</td>
                          <td className="px-3 py-2">{row.id.slice(0, 12).toUpperCase()}</td>
                          <td className="px-3 py-2 font-semibold text-emerald-300">+ {money(row.amount)}</td>
                          <td className="px-3 py-2">{money(0)}</td>
                          <td className="px-3 py-2">{money(row.afterBalance)}</td>
                          <td className="px-3 py-2">{row.description}</td>
                          <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                      {referrerCommissionRows.length === 0 && (
                        <tr>
                          <td className="px-3 py-3 text-slate-600" colSpan={7}>
                            No referrer commission records yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "binaryCommission" && (
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <h2 className="mb-3 text-lg font-semibold">Binary Commission</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-ayur-maroon/80">
                      <tr>
                        <th className="px-3 py-2">SL</th>
                        <th className="px-3 py-2">TRX-ID</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Charge</th>
                        <th className="px-3 py-2">After Balance</th>
                        <th className="px-3 py-2">Detail</th>
                        <th className="px-3 py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {binaryCommissionRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">{row.sl}</td>
                          <td className="px-3 py-2">{row.id.slice(0, 12).toUpperCase()}</td>
                          <td className="px-3 py-2 font-semibold text-emerald-300">+ {money(row.amount)}</td>
                          <td className="px-3 py-2">{money(0)}</td>
                          <td className="px-3 py-2">{money(row.afterBalance)}</td>
                          <td className="px-3 py-2">{row.description}</td>
                          <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                      {binaryCommissionRows.length === 0 && (
                        <tr>
                          <td className="px-3 py-3 text-slate-600" colSpan={7}>
                            No binary commission records yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "products" && (
              <section className="space-y-4">
                {isAdmin && (
                  <form
                    onSubmit={onAddProduct}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-5 md:grid-cols-2"
                  >
                    <h2 className="md:col-span-2 text-lg font-semibold">Add Product</h2>
                    <Field label="Product name">
                      <input
                        required
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <Field label="Category (optional)">
                      <input
                        value={newProductCategory}
                        onChange={(e) => setNewProductCategory(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <Field label="Price (USD)">
                      <input
                        required
                        type="number"
                        min={0}
                        step="0.01"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Description">
                        <textarea
                          required
                          value={newProductDescription}
                          onChange={(e) => setNewProductDescription(e.target.value)}
                          className="h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="rounded-md bg-ayur-gold px-4 py-2 font-semibold text-ayur-maroon hover:bg-ayur-gold/90"
                      >
                        Create Product
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className={`rounded-xl border p-5 ${
                        product.isActive
                          ? "border-slate-200 bg-white shadow-sm"
                          : "border-ayur-gold/50 bg-amber-50/40"
                      }`}
                    >
                      {product.imageUrl && (
                        <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={640}
                            height={420}
                            className="h-40 w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold">{product.name}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            {product.category ?? "General"} • {product.slug}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            product.isActive
                              ? "bg-emerald-900/60 text-emerald-200"
                              : "bg-ayur-maroon/90 text-amber-50"
                          }`}
                        >
                          {product.isActive ? "Active" : "Hidden"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{product.description}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-base font-bold text-ayur-green">{money(product.price)}</p>
                        <div className="flex flex-wrap gap-2">
                          {!isAdmin && product.isActive && (
                            <button
                              type="button"
                              disabled={purchaseBusyId === product.id}
                              onClick={() => onPurchaseProduct(product.id)}
                              className="rounded-md bg-ayur-green px-3 py-2 text-xs font-semibold text-white hover:bg-ayur-green/90 disabled:opacity-60"
                            >
                              {purchaseBusyId === product.id ? "Applying…" : "Buy (BV/PV)"}
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => toggleProductStatus(product.id, product.isActive)}
                              className="rounded bg-ayur-maroon px-3 py-1 text-xs text-white hover:bg-ayur-maroon/90"
                            >
                              {product.isActive ? "Hide" : "Activate"}
                            </button>
                          )}
                        </div>
                      </div>
                      {!isAdmin && product.isActive && (
                        <p className="mt-2 text-xs text-slate-500">
                          Price equals qualifying BV/PV; purchase credits your PV and flows BV to your upline per plan.
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "plans" && (
              <section className="space-y-4">
                <article className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                  <h2 className="text-lg font-semibold">Plans</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Compare plan tiers, business volume (BV), and request upgrades.
                  </p>
                  {currentMember && (
                    <p className="mt-2 text-sm text-ayur-green">
                      Current plan: {packageMap.get(currentMember.packageId)?.name ?? currentMember.packageId}
                    </p>
                  )}
                </article>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {packages.map((pkg) => {
                    const currentPrice = currentMember
                      ? (packageMap.get(currentMember.packageId)?.price ?? 0)
                      : 0;
                    const isClaimed = currentMember?.packageId === pkg.id;
                    const canUpgrade = !!currentMember && pkg.price > currentPrice;
                    const estimatedKes = Math.round(pkg.price * 135);
                    const bv = bvByPackageId[pkg.id as keyof typeof bvByPackageId] ?? 0;

                    return (
                      <article
                        key={pkg.id}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm p-5"
                      >
                        <div className="rounded-full bg-ayur-green/10 px-4 py-2 text-center text-xl font-bold uppercase tracking-wide text-ayur-green">
                          {pkg.name.split("/")[0].trim()}
                        </div>
                        <div className="mt-5 space-y-1 text-center">
                          <p className="text-4xl font-bold">KES {estimatedKes.toLocaleString()}</p>
                          <p className="text-3xl font-semibold text-slate-200">${pkg.price.toLocaleString()}</p>
                        </div>
                        <p className="mt-5 text-center text-sm text-slate-600">
                          Business Volume (BV): <span className="font-semibold">{bv}</span>
                        </p>

                        <div className="mt-5">
                          {isClaimed ? (
                            <button
                              disabled
                              className="w-full rounded-full bg-emerald-600 px-4 py-2 font-semibold text-white"
                            >
                              CLAIMED
                            </button>
                          ) : canUpgrade && user?.role === "MEMBER" ? (
                            <button
                              onClick={() => requestPlanUpgrade(pkg.id, pkg.name)}
                              className="w-full rounded-full bg-ayur-gold px-4 py-2 font-semibold text-ayur-maroon hover:bg-ayur-gold/90"
                            >
                              UPGRADE NOW
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full rounded-full bg-slate-200 px-4 py-2 font-semibold text-slate-800"
                            >
                              NOT AVAILABLE
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {activeTab === "packages" && (
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                <h2 className="mb-4 text-lg font-semibold">Package Catalog</h2>
                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3"
                    >
                      <div>
                        <p className="font-semibold">{pkg.name}</p>
                        <p className="text-sm text-slate-400">ID: {pkg.id}</p>
                      </div>
                      <Field label="Price (USD)">
                        <input
                          type="number"
                          min={0}
                          value={pkg.price}
                          disabled={!isAdmin}
                          onChange={(e) => savePackagePrice(pkg.id, Number(e.target.value))}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                        />
                      </Field>
                      <div>
                        <p className="text-sm text-slate-400">Match ratios by level</p>
                        <p className="font-mono text-sm">{pkg.matchingRatios.join(" : ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "simulator" && (
              <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                  <h2 className="mb-4 text-lg font-semibold">Commission Simulator</h2>
                  <div className="space-y-3">
                    <Field label="Package">
                      <select
                        value={simPackageId}
                        onChange={(e) => onSimPackageChange(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      >
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Direct team BV (from personally sponsored volume)">
                      <input
                        type="number"
                        min={0}
                        value={simReferralSales}
                        onChange={(e) => setSimReferralSales(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <Field label="Left leg BV">
                      <input
                        type="number"
                        min={0}
                        value={simLeftVolume}
                        onChange={(e) => setSimLeftVolume(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <Field label="Right leg BV">
                      <input
                        type="number"
                        min={0}
                        value={simRightVolume}
                        onChange={(e) => setSimRightVolume(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-sm text-slate-600">Level sales for match bonus</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {simRatios.map((ratio, idx) => (
                          <label key={`${ratio}-${idx}`} className="text-xs">
                            <span className="mb-1 block text-slate-400">
                              Level {idx + 1} ({ratio}%)
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={simLevelSales[idx] ?? 0}
                              onChange={(e) => {
                                const copy = [...simLevelSales];
                                copy[idx] = Number(e.target.value);
                                setSimLevelSales(copy);
                              }}
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
                <article className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                  <h3 className="mb-4 text-lg font-semibold">Calculated Payout</h3>
                  <div className="space-y-3">
                    <PayoutRow label="Referral bonus" value={simPayout.referralBonus} />
                    <PayoutRow label="Binary bonus" value={simPayout.binaryBonus} />
                    <PayoutRow label="Match bonus" value={simPayout.matchBonus} />
                    <hr className="border-slate-700" />
                    <PayoutRow label="Total" value={simPayout.totalBonus} strong />
                  </div>
                </article>
              </section>
            )}

            {activeTab === "members" && (
              <section className="space-y-4">
                {isAdmin && (
                  <form onSubmit={onAddMember} className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-5 md:grid-cols-3">
                    <h2 className="md:col-span-3 text-lg font-semibold">Add Member</h2>
                    <Field label="Full name">
                      <input
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <Field label="Package">
                      <select
                        value={newPackageId}
                        onChange={(e) => setNewPackageId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      >
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Phone (optional)">
                      <input
                        value={newPhoneNumber}
                        onChange={(e) => setNewPhoneNumber(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                        placeholder="07... or 254..."
                      />
                    </Field>
                    <Field label="Direct team BV (demo)">
                      <input
                        type="number"
                        min={0}
                        value={newReferralSales}
                        onChange={(e) => setNewReferralSales(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <Field label="Left leg BV (demo)">
                      <input
                        type="number"
                        min={0}
                        value={newLeftVolume}
                        onChange={(e) => setNewLeftVolume(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <Field label="Right leg BV (demo)">
                      <input
                        type="number"
                        min={0}
                        value={newRightVolume}
                        onChange={(e) => setNewRightVolume(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full rounded-md bg-ayur-gold px-4 py-2 font-semibold text-ayur-maroon hover:bg-ayur-gold/90"
                      >
                        Save Member
                      </button>
                    </div>
                  </form>
                )}

                <article className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm p-2">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-ayur-maroon/80">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Package</th>
                        <th className="px-3 py-2">Rank</th>
                        <th className="px-3 py-2">Council</th>
                        <th className="px-3 py-2">PV</th>
                        <th className="px-3 py-2">L-BV</th>
                        <th className="px-3 py-2">R-BV</th>
                        <th className="px-3 py-2">Dir BV</th>
                        <th className="px-3 py-2">Est. bonus</th>
                        {isAdmin && <th className="px-3 py-2">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {memberRows.map((row) => (
                        <tr key={row.member.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">{row.member.name}</td>
                          <td className="px-3 py-2">{row.tier?.name ?? row.member.packageId}</td>
                          <td className="px-3 py-2">{row.member.rank ?? "STARTER"}</td>
                          <td className="px-3 py-2">{row.member.councilStatus ?? "NONE"}</td>
                          <td className="px-3 py-2">{money(row.member.personalVolume ?? 0)}</td>
                          <td className="px-3 py-2">{money(row.member.leftVolume ?? 0)}</td>
                          <td className="px-3 py-2">{money(row.member.rightVolume ?? 0)}</td>
                          <td className="px-3 py-2">{money(row.member.directReferralSales ?? 0)}</td>
                          <td className="px-3 py-2 font-semibold">{money(row.payout.totalBonus)}</td>
                          {isAdmin && (
                            <td className="px-3 py-2">
                              {row.member.councilStatus === "PENDING" ? (
                                <button
                                  className="rounded bg-emerald-600 px-2 py-1 text-xs hover:bg-emerald-500"
                                  onClick={() => approveCouncil(row.member.id)}
                                >
                                  Approve Council
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              </section>
            )}

            {activeTab === "transactions" && (
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <h2 className="mb-3 text-lg font-semibold">Wallet Transactions</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-ayur-maroon/80">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Member</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">{new Date(tx.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2">{tx.memberName}</td>
                          <td className="px-3 py-2">{tx.type}</td>
                          <td className="px-3 py-2">{money(tx.amount)}</td>
                          <td className="px-3 py-2">{tx.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "deposits" && (
              <section className="space-y-4">
                {!isAdmin && (
                  <form
                    onSubmit={requestDeposit}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-5 md:grid-cols-3"
                  >
                    <div className="md:col-span-3">
                      <h2 className="text-lg font-semibold">Deposit via M-Pesa Express (STK)</h2>
                      <p className="text-sm text-slate-600">
                        Submit amount and phone, then approve the STK prompt on your handset.
                      </p>
                    </div>
                    <Field label="Amount (KES)">
                      <input
                        type="number"
                        min={1}
                        step="1"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                        required
                      />
                    </Field>
                    <Field label="M-Pesa phone (e.g. 07... / 254...)">
                      <input
                        value={depositPhoneNumber}
                        onChange={(e) => setDepositPhoneNumber(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                        required
                      />
                    </Field>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-white hover:bg-emerald-400"
                      >
                        Send STK Push
                      </button>
                    </div>
                  </form>
                )}

                <article className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm p-2">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-ayur-maroon/80">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Member</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2">{row.memberName}</td>
                          <td className="px-3 py-2">{row.phoneNumber}</td>
                          <td className="px-3 py-2">{money(row.amount)}</td>
                          <td className="px-3 py-2">{row.status}</td>
                          <td className="px-3 py-2">{row.mpesaReceiptNumber ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              </section>
            )}

            {activeTab === "withdrawals" && (
              <section className="space-y-4">
                {!isAdmin && (
                  <form
                    onSubmit={requestWithdrawal}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-5 md:grid-cols-3"
                  >
                    <div className="md:col-span-3">
                      <h2 className="text-lg font-semibold">Request Withdrawal</h2>
                      <p className="text-sm text-slate-600">
                        Available balance: {money(availableBalance)}
                      </p>
                    </div>
                    <Field label="Amount (USD)">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50"
                        required
                        disabled={Boolean(withdrawalChallengeId)}
                      />
                    </Field>
                    <Field label="M-Pesa phone for B2C">
                      <input
                        value={withdrawPhoneNumber}
                        onChange={(e) => setWithdrawPhoneNumber(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50"
                        required
                        disabled={Boolean(withdrawalChallengeId)}
                      />
                    </Field>
                    <Field label="Note (optional)">
                      <input
                        value={withdrawNote}
                        onChange={(e) => setWithdrawNote(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50"
                        disabled={Boolean(withdrawalChallengeId)}
                      />
                    </Field>
                    {withdrawalChallengeId && (
                      <Field label="One-time code (email)">
                        <input
                          value={withdrawalOtpCode}
                          onChange={(e) => setWithdrawalOtpCode(e.target.value)}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                          placeholder="6-digit code"
                          minLength={6}
                          maxLength={6}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          required
                        />
                      </Field>
                    )}
                    <div className="flex flex-col gap-2 md:col-span-3 md:flex-row md:items-end">
                      {withdrawalChallengeId && (
                        <button
                          type="button"
                          onClick={() => {
                            setWithdrawalChallengeId(null);
                            setWithdrawalOtpCode("");
                            setNotice(null);
                            setError(null);
                          }}
                          className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 md:w-auto"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={withdrawalBusy}
                        className="w-full rounded-md bg-ayur-gold px-4 py-2 font-semibold text-ayur-maroon hover:bg-ayur-gold/90 disabled:opacity-70 md:w-auto md:flex-1"
                      >
                        {withdrawalBusy
                          ? "Please wait..."
                          : withdrawalChallengeId
                            ? "Confirm withdrawal"
                            : "Send OTP & continue"}
                      </button>
                    </div>
                  </form>
                )}

                <article className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm p-2">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-ayur-maroon/80">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Member</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Payout Ref</th>
                        <th className="px-3 py-2">Channel</th>
                        <th className="px-3 py-2">Note</th>
                        {isAdmin && <th className="px-3 py-2">Review</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2">{row.memberName}</td>
                          <td className="px-3 py-2">{row.phoneNumber ?? "-"}</td>
                          <td className="px-3 py-2">{money(row.amount)}</td>
                          <td className="px-3 py-2">{row.status}</td>
                          <td className="px-3 py-2">{row.payoutReference ?? "-"}</td>
                          <td className="px-3 py-2">{row.payoutChannel ?? "-"}</td>
                          <td className="px-3 py-2">{row.note ?? "-"}</td>
                          {isAdmin && (
                            <td className="px-3 py-2">
                              {row.status === "PENDING" ? (
                                <div className="flex gap-2">
                                  <button
                                    className="rounded bg-emerald-600 px-2 py-1 text-xs hover:bg-emerald-500"
                                    onClick={() => reviewWithdrawal(row.id, "APPROVED")}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="rounded bg-rose-600 px-2 py-1 text-xs hover:bg-rose-500"
                                    onClick={() => reviewWithdrawal(row.id, "REJECTED")}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              </section>
            )}

            {activeTab === "audit" && (
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <h2 className="mb-3 text-lg font-semibold">Audit Log</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-ayur-maroon/80">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Actor</th>
                        <th className="px-3 py-2">Action</th>
                        <th className="px-3 py-2">Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2">{log.actorName}</td>
                          <td className="px-3 py-2">{log.action}</td>
                          <td className="px-3 py-2">{`${log.targetType}${log.targetId ? `:${log.targetId}` : ""}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "reconciliation" && isAdmin && (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Pending STK > 10m"
                  value={String(recon.pendingStkOlderThan10Min)}
                />
                <MetricCard title="Failed Deposits" value={String(recon.failedDeposits)} />
                <MetricCard title="Pending Withdrawals" value={String(recon.pendingWithdrawals)} />
                <MetricCard
                  title="Approved Missing Meta"
                  value={String(recon.approvedWithdrawalsMissingPayoutMeta)}
                />
              </section>
            )}

            {activeTab === "support" && (
              <section className="space-y-4">
                {!isAdmin && (
                  <form
                    onSubmit={createSupportTicket}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-5 md:grid-cols-2"
                  >
                    <h2 className="md:col-span-2 text-lg font-semibold">Create Support Ticket</h2>
                    <Field label="Subject">
                      <input
                        value={supportSubject}
                        onChange={(e) => setSupportSubject(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                        required
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Message">
                        <textarea
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          className="h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                          required
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="rounded-md bg-ayur-gold px-4 py-2 font-semibold text-ayur-maroon hover:bg-ayur-gold/90"
                      >
                        Submit Ticket
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {supportTickets.map((ticket) => (
                    <article key={ticket.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{ticket.subject}</h3>
                          <p className="text-sm text-slate-600">
                            {ticket.memberName} • {new Date(ticket.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-800">{ticket.status}</span>
                          {isAdmin && (
                            <select
                              value={ticket.status}
                              onChange={(e) =>
                                updateTicketStatus(
                                  ticket.id,
                                  e.target.value as "OPEN" | "PENDING" | "CLOSED",
                                )
                              }
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                            >
                              <option value="OPEN">OPEN</option>
                              <option value="PENDING">PENDING</option>
                              <option value="CLOSED">CLOSED</option>
                            </select>
                          )}
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-slate-700">{ticket.message}</p>

                      <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Replies</p>
                        {ticket.replies.length === 0 && (
                          <p className="text-sm text-slate-400">No replies yet.</p>
                        )}
                        {ticket.replies.map((reply) => (
                          <div key={reply.id} className="rounded bg-slate-100 p-2">
                            <p className="text-xs text-slate-400">
                              {reply.userName} • {new Date(reply.createdAt).toLocaleString()}
                            </p>
                            <p className="text-sm text-slate-700">{reply.message}</p>
                          </div>
                        ))}
                      </div>

                      {ticket.status !== "CLOSED" && (
                        <div className="mt-3 flex gap-2">
                          <input
                            value={replyMessageByTicket[ticket.id] ?? ""}
                            onChange={(e) =>
                              setReplyMessageByTicket((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                            }
                            placeholder="Write a reply..."
                            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => sendTicketReply(ticket.id)}
                            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                          >
                            Reply
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "notifications" && (
              <section className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <button
                    onClick={markAllNotificationsRead}
                    className="rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
                  >
                    Mark all as read
                  </button>
                </div>
                <div className="space-y-2">
                  {notifications.length === 0 && (
                    <p className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm text-slate-600">
                      No notifications yet.
                    </p>
                  )}
                  {notifications.map((item) => (
                    <article
                      key={item.id}
                      className={`rounded-xl border p-4 ${
                        item.isRead
                          ? "border-slate-200 bg-white shadow-sm"
                          : "border-ayur-green/40 bg-ayur-green/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{item.title}</p>
                        <span className="text-xs text-slate-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{item.message}</p>
                      <div className="mt-3 flex gap-2">
                        {!item.isRead && (
                          <button
                            onClick={() => markNotificationRead(item.id)}
                            className="rounded bg-ayur-green px-2 py-1 text-xs text-white hover:bg-ayur-green/90"
                          >
                            Mark read
                          </button>
                        )}
                        {item.link && (
                          <button
                            onClick={() => {
                              const link = item.link ?? "";
                              if (link.includes("tab=")) {
                                const tab = link.split("tab=")[1] as TabId;
                                if (tabLabels[tab]) setActiveTab(tab);
                              }
                            }}
                            className="rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600"
                          >
                            Open
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "sms" && isAdmin && (
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <h2 className="mb-3 text-lg font-semibold">SMS Delivery Logs</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-ayur-maroon/80">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Recipient</th>
                        <th className="px-3 py-2">Provider</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Message</th>
                        <th className="px-3 py-2">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smsLogs.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            {(row.userName || row.memberName || "Unknown") + ` (${row.toPhone})`}
                          </td>
                          <td className="px-3 py-2">{row.provider}</td>
                          <td className="px-3 py-2">{row.status}</td>
                          <td className="px-3 py-2">{row.message}</td>
                          <td className="px-3 py-2">{row.error ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "settings" && (
              <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                  <h2 className="mb-4 text-lg font-semibold">Bonus Percentages</h2>
                  <div className="space-y-3">
                    <Field label="Referral bonus %">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={settings.referralPercent}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          saveSettings({ ...settings, referralPercent: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                    <Field label="Binary bonus %">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={settings.binaryPercent}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          saveSettings({ ...settings, binaryPercent: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                    </Field>
                  </div>
                </article>
              </section>
            )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </article>
  );
}

function PayoutRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-slate-700">{label}</p>
      <p className={strong ? "text-xl font-bold text-ayur-green" : "font-semibold"}>{money(value)}</p>
    </div>
  );
}
