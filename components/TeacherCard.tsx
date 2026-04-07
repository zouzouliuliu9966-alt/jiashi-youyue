import { Teacher } from '@/lib/types'

const TIER_LABELS: Record<number, string> = {
  1: '⭐ 基础档',
  2: '⭐⭐ 进阶档',
  3: '⭐⭐⭐ 精英档',
}

const TIER_COLORS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-600',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-yellow-100 text-yellow-700',
}

export default function TeacherCard({ teacher, onBook }: { teacher: Teacher; onBook: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex gap-3">
        {teacher.photo_url ? (
          <img src={teacher.photo_url} alt={teacher.name}
            className="w-16 h-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <span className="text-2xl text-orange-400">师</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">{teacher.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLORS[teacher.tier]}`}>
              {TIER_LABELS[teacher.tier]}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {teacher.teacher_type}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {teacher.subjects?.join('·')} · {teacher.grades?.join('/')}
          </p>
          {teacher.highlight && (
            <p className="text-sm text-orange-600 mt-1">"{teacher.highlight}"</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div><span className="text-gray-400">上课方式：</span>{teacher.teaching_mode}</div>
        {teacher.teaching_mode !== '工作室' && teacher.service_areas && (
          <div><span className="text-gray-400">上门范围：</span>{teacher.service_areas}</div>
        )}
        {String((teacher as Record<string, unknown>).studio_address || '') !== '' && (
          <div className="col-span-2"><span className="text-gray-400">工作室地址：</span>{String((teacher as Record<string, unknown>).studio_address)}</div>
        )}
        <div><span className="text-gray-400">可用时间：</span>{teacher.available_time}</div>
        <div><span className="text-gray-400">教龄：</span>{teacher.years_exp}年</div>
        <div><span className="text-gray-400">收费：</span>
          <span className="text-orange-500 font-medium">{teacher.price}</span>
        </div>
      </div>

      {teacher.bio && (
        <p className="mt-3 text-sm text-gray-500 leading-relaxed">{teacher.bio}</p>
      )}

      <button onClick={onBook}
        className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
        预约该老师试课
      </button>
    </div>
  )
}
