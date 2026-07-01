import type { MessageSituation } from '../data/messageTemplates'
import { buildMessage } from '../data/messageTemplates'

export interface MessageQueueLead {
  id: string
  name: string
  line_registered_at: string | null
  status: string
  challenge_progress: boolean[]
}

export interface QueueItem {
  leadId: string
  name: string
  situation: MessageSituation
  dayNumber: number
  message: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysSince(registeredAt: string, today: Date): number {
  const registered = new Date(`${registeredAt}T00:00:00`)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.floor((todayStart.getTime() - registered.getTime()) / MS_PER_DAY)
  return diff + 1 // 登録日を1日目とする
}

// 見込み客ごとに、今日送るべきLINEメッセージを判定する。
// LINE Messaging APIとの自動連携は行わず、文面の用意までを行う。
export function computeDueMessage(lead: MessageQueueLead, today = new Date()): QueueItem | null {
  if (!lead.line_registered_at) return null
  if (lead.status !== 'LINE登録済み' && lead.status !== 'チャレンジ中') return null

  const elapsedDays = daysSince(lead.line_registered_at, today)
  if (elapsedDays < 1) return null

  let situation: MessageSituation
  let dayNumber = elapsedDays

  if (elapsedDays <= 7) {
    if (elapsedDays === 1) {
      situation = 'welcome'
    } else {
      const previousDayDone = lead.challenge_progress[elapsedDays - 2] ?? false
      situation = previousDayDone ? 'reminder' : 'encouragement'
    }
  } else if (elapsedDays === 8) {
    const allDone = lead.challenge_progress.slice(0, 7).every(Boolean)
    situation = allDone ? 'graduation' : 'reengagement'
    dayNumber = 7
  } else {
    return null
  }

  return {
    leadId: lead.id,
    name: lead.name,
    situation,
    dayNumber,
    message: buildMessage(situation, lead.name, dayNumber),
  }
}

export function computeMessageQueue(leads: MessageQueueLead[], today = new Date()): QueueItem[] {
  return leads
    .map((lead) => computeDueMessage(lead, today))
    .filter((item): item is QueueItem => item !== null)
}
