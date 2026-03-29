import { inngest } from "./client"
import {
  sendMessage,
  notifyAgencyNewCandidate,
  notifyAgencyNewApplication,
  notifyEmployerNewApplication,
  notifyAgencyWorkerSelected,
  notifyEmployerAutoRejected,
} from "@/lib/telegram"
import { supabase } from "@/lib/supabase"

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
          `Теперь вы можете просматривать вакансии и подавать заявки на нашем сайте.`
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
          `Подробности — на сайте в разделе «Мои заявки».`
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
