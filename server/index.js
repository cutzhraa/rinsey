const express = require('express')
const cors = require('cors')
const midtransClient = require('midtrans-client')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

// Initialize Midtrans Snap Client
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
})

// Endpoint untuk Generate Transaction Token / QRIS
app.post('/api/payment/create', async (req, res) => {
  try {
    const { order_id, gross_amount, customer_name, customer_email, customer_phone } = req.body

    const parameter = {
      transaction_details: {
        order_id: order_id,
        gross_amount: Number(gross_amount)
      },
      customer_details: {
        first_name: customer_name || 'Pelanggan Laundry',
        email: customer_email || 'customer@example.com',
        phone: customer_phone || ''
      },
      enabled_payments: ['qris', 'gopay']
    }

    const transaction = await snap.createTransaction(parameter)

    res.json({
      status: 'success',
      token: transaction.token,
      redirect_url: transaction.redirect_url
    })
  } catch (error) {
    console.error('Midtrans Error:', error)
    res.status(500).json({ status: 'error', message: error.message })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server Node.js Rinsey running on port ${PORT}`)
})