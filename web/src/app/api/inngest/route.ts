import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { renderJob } from "@/lib/functions/renderJob";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [renderJob],
});
