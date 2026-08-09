// Invitation rewards are part of the public product. Set the variable to
// "false" only when an emergency operational shutdown is required.
export const inviteRewardsEnabled = import.meta.env.VITE_INVITE_REWARDS_ENABLED !== "false";

// Keep the unfinished reverse-prompt route out of the user-facing product until it is ready.
export const reversePromptEnabled = import.meta.env.VITE_REVERSE_PROMPT_ENABLED === "true";
