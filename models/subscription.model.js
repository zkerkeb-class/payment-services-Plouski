const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  planId: {
    type: String,
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'],
    default: 'incomplete'
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  canceledAt: {
    type: Date
  },
  paymentMethod: {
    type: String
  },
  latestInvoice: {
    type: String
  },
  metadata: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

// Index pour améliorer les performances des requêtes
subscriptionSchema.index({ currentPeriodEnd: 1 });
subscriptionSchema.index({ status: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;