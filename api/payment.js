import midtransClient from 'midtrans-client'

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    // Parse body jika berupa string
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { order_id, gross_amount, customer_name, customer_phone } = body || {}

    const amount = Math.round(Number(gross_amount))
    if (!amount || amount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Nominal transaksi tidak valid' })
    }

    const coreApi = new midtransClient.CoreApi({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY || 'Mid-server-4QYh69ZUsuCLYgTcS9L7p352',
      clientKey: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-mPIRBZUCLlsliqWs'
    })

    const parameter = {
      payment_type: 'qris',
      transaction_details: {
        order_id: `${order_id || 'ORDER'}-${Date.now()}`,
        gross_amount: amount
      },
      customer_details: {
        first_name: customer_name || 'Pelanggan Laundry',
        phone: customer_phone || '08123456789'
      },
    }

    const transaction = await coreApi.charge(parameter)
    const qrCodeAction = transaction.actions?.find(action => action.name === 'generate-qr-code')

    if (!qrCodeAction?.url) {
      return res.status(502).json({
        status: 'error',
        message: 'Midtrans tidak mengembalikan QRIS untuk transaksi ini'
      })
    }

    return res.status(200).json({
      status: 'success',
      order_id: transaction.order_id,
      qr_url: qrCodeAction.url
    })
  } catch (error) {
    console.error('Vercel Midtrans Serverless Error:', error)
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Internal Server Error' 
    })
  }
}