const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - userId
 *         - stripePaymentId
 *         - amount
 *         - currency
 *         - paymentMethod
 *       properties:
 *         _id:
 *           type: string
 *           description: L'ID auto-généré du paiement
 *         userId:
 *           type: string
 *           description: L'ID de l'utilisateur qui a effectué le paiement
 *         stripePaymentId:
 *           type: string
 *           description: L'ID de l'intention de paiement Stripe
 *         amount:
 *           type: number
 *           description: Le montant du paiement
 *         currency:
 *           type: string
 *           description: "La devise du paiement (ex: eur)"
 *         status:
 *           type: string
 *           description: Le statut du paiement
 *           enum: [pending, requires_confirmation, requires_payment_method, requires_action, processing, succeeded, failed, refunded, canceled]
 *         paymentMethod:
 *           type: string
 *           description: L'ID de la méthode de paiement utilisée
 *         description:
 *           type: string
 *           description: Description du paiement
 *         metadata:
 *           type: object
 *           description: Métadonnées supplémentaires
 *         invoiceId:
 *           type: string
 *           description: L'ID de la facture associée
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date de création du paiement
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de dernière mise à jour du paiement
 */

const paymentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  stripePaymentId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'EUR'
  },
  status: {
    type: String,
    enum: ['pending', 'requires_confirmation', 'requires_payment_method', 'requires_action', 'processing', 'succeeded', 'failed', 'refunded', 'canceled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  metadata: {
    type: Object,
    default: {}
  },
  invoiceId: {
    type: String,
    ref: 'Invoice'
  }
}, { timestamps: true });

// Index pour améliorer les performances des requêtes
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ userId: 1, status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;