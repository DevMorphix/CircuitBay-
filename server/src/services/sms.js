// SMS for phone OTP. `console` logs the code (dev/tests); `msg91` sends
// via MSG91's Flow API with a DLT-approved OTP template.
// TODO_CLIENT: register the sender ID + OTP template on DLT / MSG91, then
// set MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID. Check the template's
// variable name (assumed `otp` below) against the approved template.
export function createSmsService(config, { log = console.log } = {}) {
  const sent = []

  async function sendOtp(phone, code) {
    if (config.SMS_PROVIDER === 'console') {
      sent.push({ phone, code })
      log(`[sms] OTP for ${phone}: ${code}`)
      return
    }
    const res = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: { authkey: config.MSG91_AUTH_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        template_id: config.MSG91_OTP_TEMPLATE_ID,
        short_url: '0',
        recipients: [{ mobiles: phone.replace(/^\+/, ''), otp: code }],
      }),
    })
    if (!res.ok) throw new Error(`SMS send failed: HTTP ${res.status} ${await res.text()}`)
  }

  return { sendOtp, sent }
}
