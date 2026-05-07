import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";

// `emailOTPClient` exposes:
//   authClient.emailOtp.sendVerificationOtp({ email, type })
//   authClient.emailOtp.verifyEmail({ email, otp })
//   authClient.emailOtp.resetPassword({ email, otp, password })
//   authClient.forgetPassword.emailOtp({ email })   // sends reset OTP
// It also auto-refreshes the session signal after verifyEmail so the
// app picks up the new authenticated state without a manual reload.
export const authClient = createAuthClient({
  plugins: [convexClient(), emailOTPClient()],
});
