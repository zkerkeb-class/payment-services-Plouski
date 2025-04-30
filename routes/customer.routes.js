const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID du client Stripe
 *         email:
 *           type: string
 *           description: Email du client
 *         name:
 *           type: string
 *           description: Nom du client
 *         metadata:
 *           type: object
 *           description: Métadonnées supplémentaires
 *     CustomerInput:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           description: Email du client
 *         name:
 *           type: string
 *           description: Nom du client
 *         userId:
 *           type: string
 *           description: ID de l'utilisateur dans votre système
 *         metadata:
 *           type: object
 *           description: Métadonnées supplémentaires
 */

/**
 * @swagger
 * /customers:
 *   post:
 *     summary: Crée un nouveau client Stripe
 *     tags: [Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerInput'
 *     responses:
 *       201:
 *         description: Client créé avec succès
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
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur du serveur
 */
router.post('/', customerController.createCustomer);

/**
 * @swagger
 * /customers/{customerId}:
 *   get:
 *     summary: Récupère les détails d'un client Stripe
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du client Stripe
 *     responses:
 *       200:
 *         description: Détails du client
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Client non trouvé
 *       500:
 *         description: Erreur du serveur
 */
router.get('/:customerId', customerController.getCustomer);

/**
 * @swagger
 * /customers/{customerId}/payment-methods:
 *   post:
 *     summary: Attache une méthode de paiement à un client
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du client Stripe
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
 *                 description: ID de la méthode de paiement
 *     responses:
 *       200:
 *         description: Méthode de paiement attachée avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur du serveur
 */
router.post('/:customerId/payment-methods', customerController.attachPaymentMethod);

module.exports = router;