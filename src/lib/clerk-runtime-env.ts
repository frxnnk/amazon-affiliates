export function clerkRuntimeEnv(
  publicDefaults: Record<string, string | undefined>,
  adapterEnv: Record<string, unknown> = {},
  runtimeEnv: Record<string, string | undefined> = process.env,
) {
  return {
    PUBLIC_CLERK_PUBLISHABLE_KEY: publicDefaults.PUBLIC_CLERK_PUBLISHABLE_KEY,
    PUBLIC_CLERK_SIGN_IN_URL: publicDefaults.PUBLIC_CLERK_SIGN_IN_URL,
    PUBLIC_CLERK_SIGN_UP_URL: publicDefaults.PUBLIC_CLERK_SIGN_UP_URL,
    PUBLIC_CLERK_AFTER_SIGN_IN_URL: publicDefaults.PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    PUBLIC_CLERK_AFTER_SIGN_UP_URL: publicDefaults.PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    ...adapterEnv,
    ...runtimeEnv,
  };
}
