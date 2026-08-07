export type Teacher = {
  id: string
  name: string
  photo_url: string | null
  tier: 1 | 2 | 3
  teacher_type: '在校教师' | '专职辅导' | '独立工作室' | '应届毕业生'
  subjects: string[]
  grades: string[]
  highlight: string
  bio: string
  // 「均可」= 上门 / 工作室 / 网课 都接受。
  // 数据库这列没有 CHECK 约束（实测），加新值不用先跑 SQL；
  // 但判断上课方式时别写 `!== '工作室'` 这种反向条件 —— 一加新值就会把新值
  // 错误地归进「要填上门范围」那一类。一律正向列举。
  teaching_mode: '上门' | '工作室' | '网课' | '均可'
  service_areas: string | null
  available_time: string
  price: string
  years_exp: number
  last_updated_at: string
  is_visible: boolean
  studio_address: string | null
  // email / phone 只在后台和教师本人的接口里出现，
  // 家长端公开接口 /api/teachers 的字段白名单里没有这两个
  email: string | null
  phone: string | null
  created_at: string
}

export type Booking = {
  id: string
  teacher_id: string
  student_grade: string
  phone: string
  wechat: string
  student_intro: string
  available_time: string
  address: string
  status: 'pending' | 'sent' | 'matched' | 'closed'
  created_at: string
}

export type Match = {
  id: string
  booking_id: string
  teacher_id: string
  teacher_response: 'pending' | 'accepted' | 'declined'
  payment_confirmed: boolean
  payment_amount: string | null
  created_at: string
}
