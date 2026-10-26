import { useEffect, useState } from 'react'

export default function InviteModal({ data, sending, onClose, onEmail, onWhatsApp }) {
  const [choice, setChoice] = useState(null)
  useEffect(() => { setChoice(null) }, [data])

  if (!data) return null

  const batch = data.mode === 'batch'
  const opt = batch ? data.options[0] : data.options.find((o) => o.key === choice)
  const invalid = /invalid/i.test(opt?.status || '')

  return (
    <div className="im-back" onClick={onClose}>
      <div className="im" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="im-top">
            {!batch && opt && (
              <button className="im-prev" onClick={() => setChoice(null)}>← Back</button>
            )}
            <h3>{data.title}</h3>
          </div>
          <button className="im-x" onClick={onClose} aria-label="Close">✕</button>
        </header>

        {/* step 1: pick how to invite */}
        {!opt && (
          <>
            <p className="im-sub">How do you want to invite them?</p>
            {data.options.length === 0 && (
              <div className="d-err">No email or phone found yet. Use “Find contact” on the card first.</div>
            )}
            <div className="im-opts">
              {data.options.map((o) => (
                <button key={o.key} className="im-opt" onClick={() => setChoice(o.key)}>
                  <span className="im-ico">{o.icon}</span>
                  <div>
                    <b>{o.label}</b>
                    <small>{o.hint}</small>
                  </div>
                  <i>›</i>
                </button>
              ))}
            </div>
          </>
        )}

        {/* step 2: preview, then confirm */}
        {opt && (
          <>
            <p className="im-sub">Review the message. Nothing is sent until you confirm.</p>
            <section className="im-card">
              <div className="im-row"><span>To</span><b>{opt.to}</b></div>
              {opt.recipients && (
                <div className="im-names">
                  {opt.recipients.slice(0, 12).map((n, i) => <span key={i}>{n}</span>)}
                  {opt.recipients.length > 12 && <span>+{opt.recipients.length - 12} more</span>}
                </div>
              )}
              {opt.subject && <div className="im-row"><span>Subject</span><b>{opt.subject}</b></div>}
              <pre className="im-body">{opt.text}</pre>
              {opt.recipients && <p className="im-note">Sample shown. Each person gets their own name and join link.</p>}
              {opt.key === 'whatsapp' && <p className="im-note">Opens WhatsApp with this message ready. You press send there.</p>}
              {invalid && <p className="im-warn">This address is marked invalid by the data provider, so it may bounce.</p>}

              {opt.key === 'whatsapp' ? (
                <a className="btn dark" href={opt.url} target="_blank" rel="noreferrer" onClick={onWhatsApp}>
                  Confirm & open WhatsApp
                </a>
              ) : (
                <button className="btn orange" disabled={!!sending} onClick={() => onEmail(opt.key)}>
                  {sending ? 'Sending…' : opt.recipients ? 'Confirm & send all' : 'Confirm & send email'}
                </button>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}