export type CreatorVerificationRequirement = "ONE" | "BOTH";

export function getCreatorVerificationRequirement(): CreatorVerificationRequirement {
  return process.env.CREATOR_VERIFICATION_REQUIREMENT?.trim().toUpperCase() === "BOTH" ? "BOTH" : "ONE";
}

export function isCreatorVerificationComplete(emailVerified: boolean, phoneVerified: boolean) {
  return getCreatorVerificationRequirement() === "BOTH"
    ? emailVerified && phoneVerified
    : emailVerified || phoneVerified;
}