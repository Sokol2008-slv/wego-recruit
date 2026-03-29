import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import {
  onCandidateRegistered,
  onApplicationCreated,
  onApplicationResponded,
  onApplicationSelected,
  onMeetingScheduled,
} from "@/lib/inngest/functions"
import { syncVacancies, scheduledSync } from "@/lib/inngest/sync-vacancies"

// Inngest API route — обслуживает все события
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    onCandidateRegistered,
    onApplicationCreated,
    onApplicationResponded,
    onApplicationSelected,
    onMeetingScheduled,
    syncVacancies,
    scheduledSync,
  ],
})
