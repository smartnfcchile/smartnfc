import { Resend } from "resend";

export function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export const resend = createResendClient();
