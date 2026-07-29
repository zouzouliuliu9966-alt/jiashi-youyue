// 课时订单的 lesson_status 取值，必须和数据库 lesson_orders_lesson_status_check 约束保持一致
export type LessonStatus =
  | 'pending'          // 待上课
  | 'teacher_done'     // 老师已标记完课，等家长确认
  | 'confirmed'        // 家长已确认
  | 'auto_confirmed'   // 超时自动确认
  | 'cancelled'        // 已取消

// 老师已标记完课（含家长确认后的状态），可以结算
export const DONE_STATUSES: LessonStatus[] = ['teacher_done', 'confirmed', 'auto_confirmed']

// 家长已确认（含自动确认）
export const CONFIRMED_STATUSES: LessonStatus[] = ['confirmed', 'auto_confirmed']

export function isDone(s: string): boolean {
  return (DONE_STATUSES as string[]).includes(s)
}

export function isConfirmed(s: string): boolean {
  return (CONFIRMED_STATUSES as string[]).includes(s)
}

export function lessonStatusLabel(s: string): string {
  switch (s) {
    case 'pending': return '待上课'
    case 'teacher_done': return '已完课待确认'
    case 'confirmed': return '家长已确认'
    case 'auto_confirmed': return '超时自动确认'
    case 'cancelled': return '已取消'
    default: return s
  }
}
