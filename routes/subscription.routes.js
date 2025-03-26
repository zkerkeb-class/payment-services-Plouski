const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       required:
 *         - userId
 *         - stripeSubscriptionId
 *         - stripeCustomerId
 *         - planId
 *         - planName
 *       properties:
 *         _id:
 *           type: string
 *           description: L'ID auto-généré de l'abonnement
 *         userId:
 *           type: string
 *           description: L'ID de l'utilisateur abonné
 *         stripeSubscriptionId:
 *           type: string
 *           description: L'ID de l'abonnement Stripe
 *         stripeCustomerId:
 *           type: string
 *           description: L'ID du client Stripe
 *         planId:
 *           type: string
 *           description: L'ID du plan d'abonnement
 *         planName:
 *           type: string
 *           description: Nom du plan d'abonnement
 *         status:
 *           type: string
 *           description: Statut de l'abonnement
 *           enum: [active, canceled, incomplete, incomplete_expired, past_due, trialing, unpaid]
 *         currentPeriodStart:
 *           type: string
 *           format: date-time
 *           description: Date de début de la période actuelle
 *         currentPeriodEnd:
 *           type: string
 *           format: date-time
 *           description: Date de fin de la période actuelle
 *         cancelAtPeriodEnd:
 *           type: boolean
 *           description: Indique si l'abonnement sera annulé à la fin de la période
 *         canceledAt:
 *           type: string
 *           format: date-time
 *           description: Date d'annulation de l'abonnement
 *         paymentMethod:
 *           type: string
 *           description: Méthode de paiement utilisée
 *     SubscriptionInput:
 *       type: object
 *       required:
 *         - priceId
 *         - paymentMethodId
 *       properties:
 *         priceId:
 *           type: string
 *           description: ID du prix Stripe pour l'abonnement
 *         paymentMethodId:
 *           type: string
 *           description: ID de la méthode de paiement
 *         planName:
 *           type: string
 *           description: Nom du plan d'abonnement
 *         trialPeriodDays:
 *           type: integer
 *           description: Durée de la période d'essai en jours
 *         userId:
 *           type: string
 *           description: ID de l'utilisateur
 *         stripeCustomerId:
 *           type: string
 *           description: ID du client Stripe (si disponible)
 */

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Crée un nouvel abonnement
 *     tags: [Abonnements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscriptionInput'
 *     responses:
 *       201:
 *         description: Abonnement créé avec succès
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
 *                     subscriptionId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     clientSecret:
 *                       type: string
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur du serveur
 */
router.post('/', subscriptionController.createSubscription);

/**
 * @swagger
 * /subscriptions/{subscriptionId}/cancel:
 *   post:
 *     summary: Annule un abonnement
 *     tags: [Abonnements]
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de l'abonnement
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelImmediately:
 *                 type: boolean
 *                 description: Si true, annule immédiatement l'abonnement, sinon à la fin de la période
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Abonnement annulé avec succès
 *       404:
 *         description: Abonnement non trouvé
 *       403:
 *         description: Accès non autorisé
 *       500:
 *         description: Erreur du serveur
 */
router.post('/:subscriptionId/cancel', subscriptionController.cancelSubscription);

/**
 * @swagger
 * /subscriptions/{subscriptionId}:
 *   get:
 *     summary: Récupère les détails d'un abonnement
 *     tags: [Abonnements]
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de l'abonnement
 *     responses:
 *       200:
 *         description: Détails de l'abonnement
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 *       404:
 *         description: Abonnement non trouvé
 *       403:
 *         description: Accès non autorisé
 *       500:
 *         description: Erreur du serveur
 */
router.get('/:subscriptionId', subscriptionController.getSubscription);

/**
 * @swagger
 * /subscriptions/user/{userId}:
 *   get:
 *     summary: Récupère les abonnements d'un utilisateur
 *     tags: [Abonnements]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de l'utilisateur
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtre par statut d'abonnement
 *     responses:
 *       200:
 *         description: Liste des abonnements
 *       500:
 *         description: Erreur du serveur
 */
router.get('/user/:userId', subscriptionController.getUserSubscriptions);

/**
 * @swagger
 * /subscriptions/{subscriptionId}/payment-method:
 *   put:
 *     summary: Met à jour la méthode de paiement d'un abonnement
 *     tags: [Abonnements]
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de l'abonnement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethodId
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 description: ID de la nouvelle méthode de paiement
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Méthode de paiement mise à jour avec succès
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Abonnement non trouvé
 *       403:
 *         description: Accès non autorisé
 *       500:
 *         description: Erreur du serveur
 */
router.put('/:subscriptionId/payment-method', subscriptionController.updateSubscriptionPaymentMethod);

module.exports = router;