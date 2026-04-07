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
  teaching_mode: '上门' | '工作室' | '均可'
  service_areas: string | null
  available_time: string
  price: string
  years_exp: number
  last_updated_at: string
  is_visible: boolean
  email: string
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
  created_at: string
}
