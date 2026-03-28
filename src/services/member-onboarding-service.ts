import { hash } from "bcryptjs";
import { calculatePayout } from "@/lib/compensation";
import { processQualifyingVolume } from "@/lib/everhealthy-engine";
import { councilStatusFromPackageId, rankFromPackageId } from "@/lib/member-rules";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { findBinaryPlacement } from "@/lib/tree";
import { CreateMemberInput, RegisterMemberInput } from "@/contracts/member";
import { normalizeUserEmail } from "@/lib/user-email";

function makeReferralCode(name: string): string {
  const base = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "MEMBER";
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `${base}${rand}`;
}

export async function registerMemberAccount(input: RegisterMemberInput) {
  const { name, password, phoneNumber, packageId, referralCode, position } = input;
  const email = normalizeUserEmail(input.email);

  const [existing, tier] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.packageTier.findUnique({ where: { id: packageId } }),
  ]);

  if (existing) return { error: "Email already exists", status: 409 as const };
  if (!tier) return { error: "Invalid package", status: 404 as const };

  const referredBy = referralCode
    ? await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
        include: { memberProfile: true },
      })
    : null;

  const passwordHash = await hash(password, 10);
  const generatedCode = makeReferralCode(name);
  const levelSales = new Array((tier.matchingRatios as number[]).length).fill(0);

  const user = await prisma.$transaction(async (tx) => {
    let binaryParentId: string | undefined;
    let binaryPosition: "LEFT" | "RIGHT" | undefined;

    if (referredBy?.memberProfile?.id) {
      const slot = await findBinaryPlacement(tx, referredBy.memberProfile.id, position ?? "left");
      binaryParentId = slot.binaryParentId;
      binaryPosition = slot.binaryPosition;
    }

    const created = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "MEMBER",
        referralCode: generatedCode,
        referredById: referredBy?.id,
        memberProfile: {
          create: {
            name,
            phoneNumber,
            packageId,
            rank: rankFromPackageId(packageId),
            councilStatus: councilStatusFromPackageId(packageId),
            levelSales,
            binaryParentId,
            binaryPosition,
          },
        },
      },
      include: { memberProfile: true },
    });

    if (created.memberProfile) {
      await processQualifyingVolume(tx, {
        originMemberId: created.memberProfile.id,
        bvAmount: tier.price,
        pvAmount: tier.price,
        source: { kind: "registration", packageLabel: tier.name },
        originMemberDisplayName: name,
      });
    }

    return created;
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "member.register",
    targetType: "User",
    targetId: user.id,
    metadata: {
      packageId,
      referralCode: generatedCode,
      sponsorReferralCode: referredBy?.referralCode ?? null,
      requestedPosition: position ?? null,
      assignedPosition: user.memberProfile?.binaryPosition ?? null,
    },
  });

  return {
    status: 200 as const,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      phoneNumber: user.memberProfile?.phoneNumber ?? null,
      role: user.role,
      referralCode: user.referralCode,
    },
  };
}

export async function createMemberByAdmin(input: CreateMemberInput, actorUserId: string) {
  const tier = await prisma.packageTier.findUnique({ where: { id: input.packageId } });
  if (!tier) return { error: "Unknown package", status: 404 as const };

  const settings = await prisma.compensationSetting.findUnique({ where: { id: "default" } });
  if (!settings) return { error: "Compensation settings missing", status: 500 as const };

  const levelSales = new Array((tier.matchingRatios as number[]).length).fill(0);

  const payout = calculatePayout(
    {
      id: "new-member",
      name: input.name,
      packageId: input.packageId,
      personalVolume: 0,
      directReferralSales: input.directReferralSales,
      leftVolume: input.leftVolume,
      rightVolume: input.rightVolume,
      levelSales,
    },
    [
      {
        id: tier.id,
        name: tier.name,
        price: tier.price,
        matchingRatios: tier.matchingRatios as number[],
      },
    ],
    {
      referralPercent: settings.referralPercent,
      binaryPercent: settings.binaryPercent,
    },
  );

  const member = await prisma.$transaction(async (tx) => {
    const createdMember = await tx.member.create({
      data: {
        name: input.name,
        phoneNumber: input.phoneNumber,
        packageId: input.packageId,
        directReferralSales: input.directReferralSales,
        leftVolume: input.leftVolume,
        rightVolume: input.rightVolume,
        personalVolume: 0,
        levelSales,
        rank: rankFromPackageId(input.packageId),
        councilStatus: councilStatusFromPackageId(input.packageId),
      },
    });

    const txRows = [
      {
        type: "REFERRAL" as const,
        amount: payout.referralBonus,
        description: "Referral bonus from direct sales",
      },
      {
        type: "BINARY" as const,
        amount: payout.binaryBonus,
        description: "Binary bonus from weak leg volume",
      },
      {
        type: "MATCH" as const,
        amount: payout.matchBonus,
        description: "Matching bonus based on package levels",
      },
    ].filter((row) => row.amount > 0);

    if (txRows.length > 0) {
      await tx.walletTransaction.createMany({
        data: txRows.map((row) => ({
          memberId: createdMember.id,
          type: row.type,
          amount: row.amount,
          description: row.description,
        })),
      });
    }

    return createdMember;
  });

  await createAuditLog({
    actorUserId,
    action: "member.create",
    targetType: "Member",
    targetId: member.id,
    metadata: {
      packageId: member.packageId,
      rank: member.rank,
      councilStatus: member.councilStatus,
    },
  });

  return {
    status: 200 as const,
    data: {
      id: member.id,
      userId: member.userId,
      name: member.name,
      phoneNumber: member.phoneNumber,
      packageId: member.packageId,
      rank: member.rank,
      councilStatus: member.councilStatus,
      personalVolume: member.personalVolume,
      directReferralSales: member.directReferralSales,
      leftVolume: member.leftVolume,
      rightVolume: member.rightVolume,
      levelSales: member.levelSales,
    },
  };
}
