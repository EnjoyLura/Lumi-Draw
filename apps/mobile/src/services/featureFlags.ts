// Invitation rewards stay disabled in review builds unless explicitly enabled.
export const inviteRewardsEnabled = import.meta.env.VITE_INVITE_REWARDS_ENABLED === "true";

// Keep the unfinished reverse-prompt route out of the user-facing product until it is ready.
export const reversePromptEnabled = import.meta.env.VITE_REVERSE_PROMPT_ENABLED === "true";
