import { createNeonAuth } from "@neondatabase/auth/next/server";

let authInstance: ReturnType<typeof createNeonAuth> | null = null;

function getRequiredEnv(name: "NEON_AUTH_BASE_URL" | "NEON_AUTH_COOKIE_SECRET") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in environment.`);
  }
  return value;
}

export function getAuth() {
  if (authInstance) {
    return authInstance;
  }

  authInstance = createNeonAuth({
    baseUrl: getRequiredEnv("NEON_AUTH_BASE_URL"),
    cookies: {
      secret: getRequiredEnv("NEON_AUTH_COOKIE_SECRET"),
      sessionDataTtl: 300,
    },
  });

  // Debug: log session and user info when getSession is called
  const originalGetSession = authInstance.getSession;
  authInstance.getSession = async (...args) => {
    const result = await originalGetSession.apply(authInstance, args);
    console.log("[AUTH DEBUG] getSession result:", result);
    return result;
  };

  return authInstance;
}
