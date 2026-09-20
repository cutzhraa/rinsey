import midtransClient from 'midtrans-client'

export default async function handler(req, res) {
  // Setting CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    const { order_id, gross_amount, customer_name, customer_phone } = req.body

    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY || 'Mid-server-4QYh69ZUsuCLYgTcS9L7p352',
      clientKey: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-mPIRBZUCLlsliqWs'
    })

    const parameter = {
      transaction_details: {
        order_id: `${order_id}-${Date.now()}`,
        gross_amount: Math.round(Number(gross_amount))
      },
      customer_details: {
        first_name: customer_name || 'Pelanggan Laundry',
        phone: customer_phone || '08123456789'
      },
      enabled_payments: ['qris', 'gopay']
    }

    const transaction = await snap.createTransaction(parameter)
    return res.status(200).json({ status: 'success', token: transaction.token })
  } catch (error) {
    console.error('Midtrans Error:', error)
    return res.status(500).json({ status: 'error', message: error.message })
  }
}