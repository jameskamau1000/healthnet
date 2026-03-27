import type { Prisma } from "@prisma/client";

export type VolumeEventSource =
  | { kind: "registration"; packageLabel: string }
  | { kind: "product"; productName: string };

function sourceLabel(source: VolumeEventSource): string {
  if (source.kind === "registration") {
    return `package: ${source.packageLabel}`;
  }
  return `product: ${source.productName}`;
}

/**
 * Everhealthy-style core: on qualifying volume (BV/PV), credit the buyer’s PV,
 * sponsor referral + gen-1 matching, and incremental binary pay up the binary upline.
 */
export async function processQualifyingVolume(
  tx: Prisma.TransactionClient,
  params: {
    originMemberId: string;
    bvAmount: number;
    pvAmount: number;
    source: VolumeEventSource;
    originMemberDisplayName: string;
  },
): Promise<void> {
  const { originMemberId, bvAmount, pvAmount, source, originMemberDisplayName } = params;
  if (bvAmount <= 0 && pvAmount <= 0) {
    return;
  }

  const settings = await tx.compensationSetting.findUnique({ where: { id: "default" } });
  if (!settings) {
    return;
  }

  const packages = await tx.packageTier.findMany();
  const pkgRows = packages.map((p) => ({
    id: p.id,
    matchingRatios: p.matchingRatios as number[],
  }));

  if (pvAmount > 0) {
    await tx.member.update({
      where: { id: originMemberId },
      data: { personalVolume: { increment: pvAmount } },
    });
  }

  if (bvAmount <= 0) {
    return;
  }

  const buyer = await tx.member.findUnique({
    where: { id: originMemberId },
    include: { user: { include: { referredBy: { include: { memberProfile: true } } } } },
  });
  if (!buyer?.user) {
    return;
  }

  const sponsorMember = buyer.user.referredBy?.memberProfile;

  if (sponsorMember) {
    const ratios =
      pkgRows.find((p) => p.id === sponsorMember.packageId)?.matchingRatios ?? [];
    const levelSales = (sponsorMember.levelSales as number[]) ?? [];

    await tx.member.update({
      where: { id: sponsorMember.id },
      data: { directReferralSales: { increment: bvAmount } },
    });

    const referralPay = (bvAmount * settings.referralPercent) / 100;
    if (referralPay > 0) {
      await tx.walletTransaction.create({
        data: {
          memberId: sponsorMember.id,
          type: "REFERRAL",
          amount: referralPay,
          description: `Referral (${settings.referralPercent}%) — ${sourceLabel(source)} — ${originMemberDisplayName}`,
        },
      });
    }

    if (ratios.length > 0) {
      const nextLevel = [...levelSales];
      while (nextLevel.length < ratios.length) {
        nextLevel.push(0);
      }
      nextLevel[0] = (nextLevel[0] ?? 0) + bvAmount;

      const oldMatch = ratios.reduce(
        (acc, r, i) => acc + (levelSales[i] ?? 0) * (r / 100),
        0,
      );
      const newMatch = ratios.reduce(
        (acc, r, i) => acc + (nextLevel[i] ?? 0) * (r / 100),
        0,
      );
      const matchPay = newMatch - oldMatch;

      await tx.member.update({
        where: { id: sponsorMember.id },
        data: { levelSales: nextLevel },
      });

      if (matchPay > 0) {
        await tx.walletTransaction.create({
          data: {
            memberId: sponsorMember.id,
            type: "MATCH",
            amount: matchPay,
            description: `Matching bonus — ${sourceLabel(source)} — ${originMemberDisplayName}`,
          },
        });
      }
    }
  }

  let current = await tx.member.findUnique({
    where: { id: originMemberId },
    select: { id: true, binaryParentId: true, binaryPosition: true },
  });

  while (current?.binaryParentId && current.binaryPosition) {
    const parent = await tx.member.findUnique({ where: { id: current.binaryParentId } });
    if (!parent) {
      break;
    }

    const oldL = parent.leftVolume;
    const oldR = parent.rightVolume;
    const oldMin = Math.min(oldL, oldR);

    const newL = current.binaryPosition === "LEFT" ? oldL + bvAmount : oldL;
    const newR = current.binaryPosition === "RIGHT" ? oldR + bvAmount : oldR;
    const newMin = Math.min(newL, newR);
    const deltaMatch = newMin - oldMin;
    const binaryPay = (deltaMatch * settings.binaryPercent) / 100;

    await tx.member.update({
      where: { id: parent.id },
      data:
        current.binaryPosition === "LEFT"
          ? { leftVolume: { increment: bvAmount } }
          : { rightVolume: { increment: bvAmount } },
    });

    if (binaryPay > 0) {
      await tx.walletTransaction.create({
        data: {
          memberId: parent.id,
          type: "BINARY",
          amount: binaryPay,
          description: `Binary (${settings.binaryPercent}%) — ${sourceLabel(source)} — ${originMemberDisplayName}`,
        },
      });
    }

    current = await tx.member.findUnique({
      where: { id: parent.id },
      select: { id: true, binaryParentId: true, binaryPosition: true },
    });
  }
}
