const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       required:
 *         - userId
 *         - stripeInvoiceId
 *         - amount
 *         - currency
 *       properties:
 *         _id:
 *           type: string
 *           description: L'ID auto-généré de la facture
 *         userId:
 *           type: string
 *           description: L'ID de l'utilisateur
 *         stripeInvoiceId:
 *           type: string
 *           description: L'ID de la facture Stripe
 *         subscriptionId:
 *           type: string
 *           description: L'ID de l'abonnement associé (si applicable)
 *         amount:
 *           type: number
 *           description: Le montant total de la facture
 *         amountPaid:
 *           type: number
 *           description: Le montant payé
 *         currency:
 *           type: string
 *           description: La devise de la facture
 *         status:
 *           type: string
 *           description: Statut de la facture
 *           enum: [draft, open, paid, uncollectible, void]
 *         pdfUrl:
 *           type: string
 *           description: URL du PDF de la facture
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: Date d'échéance de la facture
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               quantity:
 *                 type: number
 *         emailSent:
 *           type: boolean
 *           description: Indique si la facture a été envoyée par email
 *     InvoiceInput:
 *       type: object
 *       required:
 *         - userId
 *         - amount
 *         - items
 *       properties:
 *         userId:
 *           type: string
 *           description: ID de l'utilisateur
 *         amount:
 *           type: number
 *           description: Montant total de la facture
 *         currency:
 *           type: string
 *           default: EUR
 *           description: Devise de la facture
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               quantity:
 *                 type: integer
 *                 default: 1
 *         subscriptionId:
 *           type: string
 *           description: ID de l'abonnement associé
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: Date d'échéance de la facture
 */

// Routes protégées par authentification
router.use(authMiddleware);

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Crée une nouvelle facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvoiceInput'
 *     responses:
 *       201:
 *         description: Facture créée avec succès
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
 *                   $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur du serveur
 */
router.post('/', adminMiddleware, invoiceController.createInvoice);

/**
 * @swagger
 * /invoices/{invoiceId}/send:
 *   post:
 *     summary: Finalise et envoie une facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la facture
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Facture finalisée et envoyée avec succès
 *       400:
 *         description: La facture ne peut pas être finalisée
 *       404:
 *         description: Facture non trouvée
 *       500:
 *         description: Erreur du serveur
 */
router.post('/:invoiceId/send', adminMiddleware, invoiceController.finalizeAndSendInvoice);

/**
 * @swagger
 * /invoices/{invoiceId}:
 *   get:
 *     summary: Récupère les détails d'une facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la facture
 *     responses:
 *       200:
 *         description: Détails de la facture
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Facture non trouvée
 *       403:
 *         description: Accès non autorisé
 *       500:
 *         description: Erreur du serveur
 */
router.get('/:invoiceId', invoiceController.getInvoice);

/**
 * @swagger
 * /invoices/user/{userId}:
 *   get:
 *     summary: Récupère les factures d'un utilisateur
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
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
 *         description: Filtre par statut de facture
 *     responses:
 *       200:
 *         description: Liste des factures
 *       500:
 *         description: Erreur du serveur
 */
router.get('/user/:userId', invoiceController.getUserInvoices);

/**
 * @swagger
 * /invoices/{invoiceId}/mark-paid:
 *   post:
 *     summary: Marque une facture comme payée
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la facture
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: ID de l'intention de paiement
 *               amountPaid:
 *                 type: number
 *                 description: Montant payé
 *     responses:
 *       200:
 *         description: Facture marquée comme payée avec succès
 *       400:
 *         description: La facture est déjà payée
 *       404:
 *         description: Facture non trouvée
 *       500:
 *         description: Erreur du serveur
 */
router.post('/:invoiceId/mark-paid', adminMiddleware, invoiceController.markInvoiceAsPaid);

/**
 * @swagger
 * /invoices/{invoiceId}/void:
 *   post:
 *     summary: Annule une facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la facture
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Raison de l'annulation
 *     responses:
 *       200:
 *         description: Facture annulée avec succès
 *       400:
 *         description: La facture ne peut pas être annulée
 *       404:
 *         description: Facture non trouvée
 *       500:
 *         description: Erreur du serveur
 */
router.post('/:invoiceId/void', adminMiddleware, invoiceController.voidInvoice);

module.exports = router;