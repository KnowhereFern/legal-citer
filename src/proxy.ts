import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { isE2EAuthBypassEnabled } from "@/lib/auth-context";

export default isE2EAuthBypassEnabled()
  ? function e2eAuthBypassProxy() {
      return NextResponse.next();
    }
  : clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
