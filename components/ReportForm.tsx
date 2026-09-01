'use client'

import { useState } from 'react'
import { REPORT_TYPES } from '@/lib/report-types'
import { LEGAL } from '@/lib/legal'

export default function ReportForm() {
  const [type, setType] = useState('')
  const [detail, setDetail] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<null | { delivered: boolean }>(null)

  const submit = async () => {
    if (!type || !detail.trim()) {
      alert('请选择类型并填写具体情况')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, detail: detail.trim(), contact: contact.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      setLoading(false)
      if (!res.ok || json.error) {
        // 把服务端的真实原因透出来。之前统一显示「提交失败，请重试」，
        // 而限流返回的其实是「请稍后再试」—— 用户照着重试，每试一次再吃一个配额，
        // 最后彻底锁死，界面还在劝他重试。
        // 4xx 是我们自己写的中文；5xx 是服务端原文（英文、可能含内部信息），一律换固定文案
        alert(res.status >= 500 || !json.error
          ? `提交失败，请稍后再试，或直接加教务企业微信 ${LEGAL.contactWecom}`
          : json.error)
        return
      }
      // 严格判等：漏了 delivered 字段（旧版响应被缓存等）一律按未送达处理。
      // 举报不入库，误报「已收到」等于永久丢失。
      setDone({ delivered: json.delivered === true })
    } catch {
      setLoading(false)
      alert(`网络连接失败，请重试或直接加教务企业微信 ${LEGAL.contactWecom}`)
    }
  }

  if (done) {
    // 举报不入库，推送失败就没有任何副本了。这时候必须如实说，
    // 让用户知道要另外找教务补一刀，不能给个 ✅ 让他以为已经受理了。
    return done.delivered ? (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="text-3xl mb-3">✅</div>
        <p className="font-medium text-gray-900 mb-1">已收到</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          教务会在 3 个工作日内首次响应。<br />
          如果您留了联系方式，我们会把处理结果回复给您。
        </p>
      </div>
    ) : (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <p className="font-medium text-gray-900 mb-1">已提交，但通知通道暂时异常</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          您的内容可能没有送达教务。<br />
          请加教务企业微信
          <span className="font-medium text-orange-600"> {LEGAL.contactWecom} </span>
          再说一声，避免这条反馈被漏掉。
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          问题类型 <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {REPORT_TYPES.map(t => (
            <label key={t} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
              <input type="radio" name="type" value={t} checked={type === t}
                onChange={() => setType(t)} className="mt-0.5 shrink-0" />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          具体情况 <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-400 mb-1">
          请写清楚涉及哪位老师、大概什么时间、发生了什么。有截图可以稍后发给教务。
        </p>
        <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={5}
          className="w-full border rounded-xl px-3 py-2.5 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">您的联系方式</label>
        <p className="text-xs text-gray-400 mb-1">选填。留了才能把处理结果回复您；不留则匿名处理。</p>
        <input value={contact} onChange={e => setContact(e.target.value)}
          placeholder="手机号或微信号" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        提交即表示您已阅读
        <a href="/privacy" target="_blank" rel="noopener noreferrer"
          className="text-orange-600 font-medium">《隐私政策》</a>
        ，同意我们为核实处理之目的使用您填写的内容与联系方式。
        这些内容会推送到教务的企业微信，并传输至境外服务器。
      </p>

      <button onClick={submit} disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-3 font-medium text-sm transition-colors">
        {loading ? '提交中...' : '提交'}
      </button>
    </div>
  )
}
