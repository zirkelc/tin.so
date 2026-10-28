import { DEFAULT_FRAME } from "./default.ts";
import { frame as auth0 } from "./auth0.ts";
import { frame as aws } from "./aws.ts";
import { frame as bitmap } from "./bitmap.ts";
import { frame as browserbase } from "./browserbase.ts";
import { frame as clerk } from "./clerk.ts";
import { frame as cloudflare } from "./cloudflare.ts";
import { frame as elevenlabs } from "./elevenlabs.ts";
import { frame as firecrawl } from "./firecrawl.ts";
import { frame as gemini } from "./gemini.ts";
import { frame as ice } from "./ice.ts";
import { frame as mintlify } from "./mintlify.ts";
import { frame as noir } from "./noir.ts";
import { frame as nuxt } from "./nuxt.ts";
import { frame as openai } from "./openai.ts";
import { frame as prisma } from "./prisma.ts";
import { frame as resend } from "./resend.ts";
import { frame as stripe } from "./stripe.ts";
import { frame as supabase } from "./supabase.ts";
import { frame as tailwind } from "./tailwind.ts";
import { frame as triggerdev } from "./triggerdev.ts";
import { frame as vercel } from "./vercel.ts";
import type { Frame, FrameOverrides } from "./types.ts";

export { DEFAULT_FRAME } from "./default.ts";
export type { Frame, FrameContext, FrameOverrides, TitleBarStyle } from "./types.ts";

// The frames of the themes that ray.so draws in their own way, by theme id
const FRAMES: Record<string, FrameOverrides> = {
  auth0,
  aws,
  bitmap,
  browserbase,
  clerk,
  cloudflare,
  elevenlabs,
  firecrawl,
  gemini,
  ice,
  mintlify,
  noir,
  nuxt,
  openai,
  prisma,
  resend,
  stripe,
  supabase,
  tailwind,
  triggerdev,
  vercel,
  // Evil Rabbit uses the frame of Vercel in ray.so
  rabbit: vercel,
};

const resolved = new Map<string, Frame>();

/** The frame of a theme: the parts of its own frame, and the default frame for the other parts */
export function getFrame(themeId: string): Frame {
  let frame = resolved.get(themeId);
  if (!frame) {
    const overrides = Object.hasOwn(FRAMES, themeId) ? FRAMES[themeId]! : {};
    frame = {
      ...DEFAULT_FRAME,
      ...overrides,
      titleBar: { ...DEFAULT_FRAME.titleBar, ...overrides.titleBar },
    };
    resolved.set(themeId, frame);
  }
  return frame;
}
