import { useState } from 'react'
import { fieldErrors } from './api.js'
import { trackEvent } from './analytics.js'

// Submits a form's named fields through `send(data)`. Empty strings are
// dropped (so optional fields are simply omitted). Tracks sending / sent /
// error, plus per-field errors from a 400 response.
export function useSubmit(formName, send) {
  const [state, setState] = useState({ status: 'idle', error: '', fields: {} })

  const onSubmit = async (e) => {
    e.preventDefault()
    const data = Object.fromEntries([...new FormData(e.currentTarget)].filter(([, v]) => typeof v !== 'string' || v.trim() !== ''))
    setState({ status: 'sending', error: '', fields: {} })
    try {
      await send(data)
      trackEvent('form_submit', { form: formName })
      setState({ status: 'sent', error: '', fields: {} })
    } catch (err) {
      setState({ status: 'error', error: err.message, fields: fieldErrors(err) })
    }
  }

  return { ...state, sending: state.status === 'sending', sent: state.status === 'sent', onSubmit }
}
