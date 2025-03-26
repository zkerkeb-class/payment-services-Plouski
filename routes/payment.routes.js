const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');

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
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date de création du paiement
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de dernière mise à jour du paiement
 *     PaymentInput:
 *       type: object
 *       required:
 *         - amount
 *         - paymentMethodId
 *       properties:
 *         amount:
 *           type: number
 *           description: Le montant du paiement
 *         currency:
 *           type: string
 *           description: "La devise du paiement (défaut: eur)"
 *         description:
 *           type: string
 *           description: Description du paiement
 *         paymentMethodId:
 *           type: string
 *           description: L'ID de la méthode de paiement
 *         stripeCustomerId:
 *           type: string
 *           description: L'ID du client Stripe (si disponible)
 *         userId:
 *           type: string
 *           description: L'ID de l'utilisateur
 */

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Crée une nouvelle intention de paiement
 *     tags: [Paiements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInput'
 *     responses:
 *       201:
 *         description: Intention de paiement créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                     clientSecret:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur du serveur
 */
router.post('/', paymentController.createPayment);

/**
 * @swagger
 * /payments/{paymentIntentId}/confirm:
 *   post:
 *     summary: Confirme un paiement
 *     tags: [Paiements]
 *     parameters:
 *       - in: path
 *         name: paymentIntentId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de l'intention de paiement
 *     responses:
 *       200:
 *         description: Paiement confirmé avec succès
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Paiement non trouvé
 *       500:
 *         description: Erreur du serveur
 */
router.post('/:paymentIntentId/confirm', paymentController.confirmPayment);

/**
 * @swagger
 * /payments/{paymentId}:
 *   get:
 *     summary: Récupère les détails d'un paiement
 *     tags: [Paiements]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du paiement
 *     responses:
 *       200:
 *         description: Détails du paiement
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Paiement non trouvé
 *       500:
 *         description: Erreur du serveur
 */
router.get('/:paymentId', paymentController.getPayment);

/**
 * @swagger
 * /payments/user/{userId}:
 *   get:
 *     summary: Récupère l'historique des paiements d'un utilisateur
 *     tags: [Paiements]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de l'utilisateur
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Numéro de page (défaut 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Nombre d'éléments par page (défaut 10)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtre par statut de paiement
 *     responses:
 *       200:
 *         description: Liste des paiements
 *       500:
 *         description: Erreur du serveur
 */
router.get('/user/:userId', paymentController.getUserPayments);

/**
 * @swagger
 * /payments/{paymentId}/refund:
 *   post:
 *     summary: Rembourse un paiement
 *     tags: [Paiements]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du paiement
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Montant à rembourser (si non fourni, remboursement total)
 *               reason:
 *                 type: string
 *                 description: Raison du remboursement
 *     responses:
 *       200:
 *         description: Remboursement effectué avec succès
 *       400:
 *         description: Paiement non remboursable
 *       404:
 *         description: Paiement non trouvé
 *       500:
 *         description: Erreur du serveur
 */
router.post('/:paymentId/refund', paymentController.refundPayment);

/**
 * @swagger
 * /payments/checkout:
 *   post:
 *     summary: Crée une session de paiement Checkout
 *     tags: [Paiements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - successUrl
 *               - cancelUrl
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     priceId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               successUrl:
 *                 type: string
 *               cancelUrl:
 *                 type: string
 *               mode:
 *                 type: string
 *                 enum: [payment, subscription]
 *                 default: payment
 *               userId:
 *                 type: string
 *               stripeCustomerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session de paiement créée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   type: string
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur du serveur
 */
router.post('/checkout', paymentController.createCheckoutSession);

module.exports = router;