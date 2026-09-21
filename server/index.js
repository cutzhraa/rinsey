import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import midtransClient from 'midtrans-client'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Health check endpoint buat Render
app.get('/', (req, res) => {
  res.send('Rinsey Backend API Running! 🧺')
})

const coreApi = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
})

app.post(['/api/payment', '/api/payment/create'], async (req, res) => {
  try {
    const { order_id, gross_amount, customer_name, customer_phone } = req.body

    const amount = Math.round(Number(gross_amount))
    if (!amount || amount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Nominal tidak valid' })
    }

    const parameter = {
      payment_type: 'qris',
      transaction_details: {
        order_id: `${order_id}-${Date.now()}`,
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

    res.json({
      status: 'success',
      order_id: transaction.order_id,
      qr_url: qrCodeAction.url
    })
  } catch (error) {
    console.error('Midtrans Error:', error.response?.data || error.message)
    res.status(500).json({ status: 'error', message: error.message })
  }
})

// PORT HARUS DARI process.env.PORT
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))