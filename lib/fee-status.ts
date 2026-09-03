// 信息费核销状态的展示口径，三端共用一份，别各写各的。
//
// 🔴 措辞铁规矩：对老师只能说「不成单，全额退」，
//    绝不能出现「托管」「冻结」「暂不扣款」——收款走个人收款码，
//    钱在老师扫码那一秒就已经到账了，平台没有任何冻结能力。
//    说了就是假话，而且老师一看到账通知就能戳破。

export type FeeStatus = 'pending' | 'cleared' | 'refunded' | null

/** 给老师看的 */
export function feeStatusForTeacher(s: FeeStatus, paid: boolean): {
  label: string
  hint: string
  tone: 'wait' | 'ok' | 'refund' | 'none'
} {
  if (!paid) {
    return { label: '待确认收款', hint: '教务确认到账后，家长联系方式就会显示出来', tone: 'wait' }
  }
  switch (s) {
    case 'cleared':
      return { label: '已核销', hint: '这一单已开课，信息费已计入', tone: 'ok' }
    case 'refunded':
      return { label: '已退款', hint: '这一单未能开课，信息费已退回给您', tone: 'refund' }
    case 'pending':
    default:
      return {
        label: '待核销',
        hint: '如因家长方原因未能开课（失联、临时取消、需求不符），联系教务核实后全额退回',
        tone: 'wait',
      }
  }
}

/** 给教务后台看的 */
export function feeStatusForAdmin(s: FeeStatus, paid: boolean): string {
  if (!paid) return '待确认收款'
  if (s === 'cleared') return '已核销'
  if (s === 'refunded') return '已退款'
  return '待核销'
}
