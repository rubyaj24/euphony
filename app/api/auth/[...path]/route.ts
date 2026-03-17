import { getAuth } from "@/lib/auth/server";

const auth = getAuth();
export const { GET, POST, PUT, PATCH, DELETE } = auth.handler();
