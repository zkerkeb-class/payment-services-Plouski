const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  stripeInvoiceId: {
    type: String,
    required: true,
    unique: true
  },
  subscriptionId: {
    type: String,
    ref: 'Subscription'
  },
  amount: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'EUR'
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'paid', 'uncollectible', 'void'],
    default: 'draft'
  },
  pdfUrl: {
    type: String
  },
  dueDate: {
    type: Date
  },
  paymentIntentId: {
    type: String
  },
  periodStart: {
    type: Date
  },
  periodEnd: {
    type: Date
  },
  items: [{
    description: String,
    amount: Number,
    quantity: Number
  }],
  metadata: {
    type: Object,
    default: {}
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  }
}, { timestamps: true });

// Index pour améliorer les performances des requêtes
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;