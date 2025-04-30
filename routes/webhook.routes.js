const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const webhookMiddleware = require('../middlewares/webhook.middleware');

/**
 * @swagger
 * /webhooks/stripe:
 *   post:
 *     summary: Point d'entrée pour les webhooks Stripe
 *     description: Endpoint pour recevoir et traiter les événements Stripe. Cette route est appelée par Stripe lorsqu'un événement se produit.
 *     tags: [Webhooks]
 *     requestBody:
 *       description: Événement Stripe au format JSON
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Événement reçu et traité avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Signature invalide ou corps de requête incorrect
 *       500:
 *         description: Erreur lors du traitement de l'événement
 *     security: []  # No authentication required for Stripe webhooks
 */

// Appliquer le middleware de webhook pour récupérer le corps brut
router.use(webhookMiddleware);

// Route pour recevoir les webhooks Stripe
router.post('/stripe', webhookController.handleStripeWebhook);

module.exports = router;