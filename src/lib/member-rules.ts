import { MemberRank, CouncilStatus } from "@prisma/client";

export function rankFromPackageId(packageId: string): MemberRank {
  switch (packageId) {
    case "fair":
      return MemberRank.FAIR;
    case "good":
      return MemberRank.GOOD;
    case "better":
      return MemberRank.BETTER;
    case "best":
      return MemberRank.BEST;
    default:
      return MemberRank.STARTER;
  }
}

export function councilStatusFromPackageId(packageId: string): CouncilStatus {
  return packageId === "best" ? CouncilStatus.PENDING : CouncilStatus.NONE;
}
