import { inngest } from "./client"
import {
  sendMessage,
  formatDateTime,
  notifyAgencyNewCandidate,
  notifyAgencyNewApplication,
  notifyEmployerNewApplication,
  notifyAgencyWorkerSelected,
  notifyEmployerAutoRejected,
  sendMessageWithButtons,
} from "@/lib/telegram"
import { getDb } from "@/lib/supabase"

// =============================================
// EVENT: candidate.registered
// =============================================
export const onCandidateRegistered = inngest.createFunction(
  {
    id: "on-candidate-registered",
    retries: 3,
    triggers: [{ event: "candidate.registered" }],
  },
  async ({ event, step }) => {
    const { candidate } = event.data

    await step.run("notify-agency", async () => {
      return notifyAgencyNewCandidate(candidate)
    })

    if (candidate.telegram_id) {
      await step.run("notify-worker", async () => {
        return sendMessage(
          candidate.telegram_id,
          `✅ <b>Регистрация прошла успешно!</b>\n\n` +
          `Добро пожаловать в WEGO, ${candidate.name}!\n\n` +
          `Теперь вы можете просматривать вакансии и подавать заявки на нашем сайте.\n\n` +
          `🕐 ${formatDateTime()}`
        )
      })
    }

    return { success: true, candidateId: candidate.id }
  }
)

// =============================================
// EVENT: application.created
// =============================================
export const onApplicationCreated = inngest.createFunction(
  {
    id: "on-application-created",
    retries: 3,
    triggers: [{ event: "application.created" }],
  },
  async ({ event, step }) => {
    const { applicationId } = event.data

    const appData = await step.run("fetch-data", async () => {
      const supabase = getDb()
      if (!supabase) throw new Error("DB not configured")

      const { data: app } = await supabase
        .from("applications")
        .select("*, vacancy:vacancies(*, employer:employers(*)), candidate:candidates(*)")
        .eq("id", applicationId)
        .single()

      return app
    })

    if (!appData) return { error: "Application not found" }

    const employerChatId = (appData as any).vacancy?.employer?.telegram_chat_id
    if (employerChatId) {
      await step.run("notify-employer", async () => {
        return notifyEmployerNewApplication(
          employerChatId,
          applicationId,
          {
            name: (appData as any).candidate?.name || "",
            surname: (appData as any).candidate?.surname || "",
            phone: (appData as any).candidate?.phone || "",
            age_range: (appData as any).candidate?.age_range || "",
          },
          (appData as any).vacancy?.title || "Вакансия"
        )
      })
    }

    await step.run("notify-agency", async () => {
      return notifyAgencyNewApplication(
        `${(appData as any).candidate?.name} ${(appData as any).candidate?.surname}`,
        (appData as any).vacancy?.title || "Вакансия",
        (appData as any).vacancy?.company || "Компания"
      )
    })

    return { success: true }
  }
)

// =============================================
// EVENT: application.responded
// =============================================
export const onApplicationResponded = inngest.createFunction(
  {
    id: "on-application-responded",
    retries: 3,
    triggers: [{ event: "application.responded" }],
  },
  async ({ event, step }) => {
    const { applicationId, status } = event.data

    const appData = await step.run("fetch-data", async () => {
      const supabase = getDb()
      if (!supabase) throw new Error("DB not configured")

      const { data } = await supabase
        .from("applications")
        .select("*, vacancy:vacancies(*), candidate:candidates(*)")
        .eq("id", applicationId)
        .single()

      return data
    })

    if (!appData) return { error: "Application not found" }

    if ((appData as any).candidate?.telegram_id) {
      await step.run("notify-worker-telegram", async () => {
        const emoji = status === "approved" ? "✅" : "❌"
        const statusText = status === "approved" ? "одобрена" : "отклонена"

        return sendMessage(
          (appData as any).candidate.telegram_id,
          `${emoji} Ваша заявка на вакансию <b>${(appData as any).vacancy?.title}</b> ${statusText}.\n\n` +
          `Подробности — на сайте в разделе «Мои заявки».\n\n` +
          `🕐 ${formatDateTime()}`
        )
      })
    }

    return { success: true }
  }
)

// =============================================
// EVENT: application.selected
// =============================================
export const onApplicationSelected = inngest.createFunction(
  {
    id: "on-application-selected",
    retries: 3,
    triggers: [{ event: "application.selected" }],
  },
  async ({ event, step }) => {
    const { applicationId, candidateId, candidateName } = event.data

    const selectedApp = await step.run("fetch-selected", async () => {
      const supabase = getDb()
      if (!supabase) throw new Error("DB not configured")

      const { data } = await supabase
        .from("applications")
        .select("*, vacancy:vacancies(*)")
        .eq("id", applicationId)
        .single()

      return data
    })

    if (!selectedApp) return { error: "Application not found" }

    const autoRejected = await step.run("auto-reject-others", async () => {
      const supabase = getDb()
      if (!supabase) throw new Error("DB not configured")

      const { data: others } = await supabase
        .from("applications")
        .select("id, vacancy:vacancies(title, employer:employers(telegram_chat_id))")
        .eq("candidate_id", candidateId)
        .eq("status", "approved")
        .neq("id", applicationId)

      if (others && others.length > 0) {
        const otherIds = others.map((a) => a.id)
        await supabase
          .from("applications")
          .update({ status: "auto_rejected" })
          .in("id", otherIds)
      }

      return others || []
    })

    await step.run("notify-agency", async () => {
      return notifyAgencyWorkerSelected(
        candidateName,
        (selectedApp as any).vacancy?.title || "Вакансия",
        (selectedApp as any).vacancy?.company || "Компания"
      )
    })

    for (let i = 0; i < autoRejected.length; i++) {
      const other = autoRejected[i]
      const chatId = (other.vacancy as any)?.employer?.telegram_chat_id

      if (chatId) {
        await step.run(`notify-employer-rejected-${i}`, async () => {
          return notifyEmployerAutoRejected(
            chatId,
            candidateName,
            (other.vacancy as any)?.title || "Вакансия"
          )
        })
      }
    }

    return { success: true, autoRejectedCount: autoRejected.length }
  }
)

// =============================================
// EVENT: meeting.scheduled
// =============================================
const AGENCY_CHAT_ID = process.env.TELEGRAM_AGENCY_CHAT_ID || ''

export const onMeetingScheduled = inngest.createFunction(
  {
    id: "on-meeting-scheduled",
    retries: 3,
    triggers: [{ event: "meeting.scheduled" }],
  },
  async ({ event, step }) => {
    const {
      meetingId,
      scheduledAt,
      candidateName,
      vacancyTitle,
      candidateTelegramId,
    } = event.data

    const scheduledDate = new Date(scheduledAt)
    const reminderTime = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000) // 2 hours before
    const now = new Date()

    // Step 1: wait until 2 hours before scheduled_at
    if (reminderTime > now) {
      const sleepMs = reminderTime.getTime() - now.getTime()
      await step.sleep("wait-for-reminder", sleepMs)
    }

    // Step 2: send reminder to candidate
    await step.run("send-reminder", async () => {
      const supabase = getDb()
      if (!supabase) throw new Error("DB not configured")

      // Check if meeting is still active
      const { data: meeting } = await supabase
        .from("meetings")
        .select("id, status, candidate_id")
        .eq("id", meetingId)
        .single()

      if (!meeting || meeting.status === "cancelled") {
        return { skipped: true, reason: "Meeting cancelled" }
      }

      if (candidateTelegramId) {
        await sendMessageWithButtons(
          candidateTelegramId,
          `⏰ <b>Напоминание о встрече!</b>\n\n` +
          `💼 Вакансия: ${vacancyTitle}\n` +
          `📆 Время: ${formatDateTime(scheduledAt)}\n\n` +
          `Вы на связи?\n\n` +
          `🕐 ${formatDateTime()}`,
          [
            [
              { text: "✅ На связи!", callback_data: `confirm_meeting:${meetingId}` },
              { text: "❌ Не могу", callback_data: `decline_meeting:${meetingId}` },
            ],
          ]
        )
      }

      // Update reminder_sent
      await supabase
        .from("meetings")
        .update({ reminder_sent: true })
        .eq("id", meetingId)

      return { sent: true }
    })

    // Step 3: wait 30 minutes
    await step.sleep("wait-30-min", 30 * 60 * 1000)

    // Step 4: check if candidate confirmed
    const result = await step.run("check-confirmation", async () => {
      const supabase = getDb()
      if (!supabase) throw new Error("DB not configured")

      const { data: meeting } = await supabase
        .from("meetings")
        .select("*, candidate:candidates(name, surname)")
        .eq("id", meetingId)
        .single()

      if (!meeting) return { error: "Meeting not found" }

      if (meeting.status === "cancelled") {
        return { skipped: true, reason: "Meeting already cancelled" }
      }

      if (meeting.candidate_confirmed === null) {
        // No response — update status
        await supabase
          .from("meetings")
          .update({ status: "no_response" })
          .eq("id", meetingId)

        const name = `${meeting.candidate?.name || ''} ${meeting.candidate?.surname || ''}`.trim()

        if (AGENCY_CHAT_ID) {
          await sendMessage(
            AGENCY_CHAT_ID,
            `⚠️ <b>Кандидат ${name} не ответил на напоминание о встрече!</b>\n\n` +
            `💼 ${vacancyTitle}\n` +
            `Статус: вне зоны доступа\n\n` +
            `🕐 ${formatDateTime()}`
          )
        }

        return { noResponse: true }
      }

      // Candidate already confirmed — nothing to do
      return { confirmed: true }
    })

    return { success: true, ...result }
  }
)
