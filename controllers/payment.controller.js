const stripeService = require('../services/stripe.service');
const emailService = require('../services/email.service');
const userService = require('../services/user.service');
const Payment = require('../models/payment.model');
const Invoice = require('../models/invoice.model');

/**
 * Contrôleur pour gérer les paiements
 */
class PaymentController {
    /**
     * Crée un paiement unique
     * @param {Object} req - Requête HTTP
     * @param {Object} res - Réponse HTTP
     * @returns {Promise<Object>} - Résultat du paiement
     */
    async createPayment(req, res) {
        try {
            const { amount, currency, description, paymentMethodId, metadata, stripeCustomerId } = req.body;
            const userId = req.body.userId || (req.user ? req.user.id : 'user123');

            // Vérifier les données requises
            if (!amount || !paymentMethodId) {
                return res.status(400).json({
                    success: false,
                    message: 'Le montant et la méthode de paiement sont requis'
                });
            }

            let customerId = stripeCustomerId;

            // Si pas de customerId direct, chercher l'utilisateur
            if (!customerId) {
                try {
                    const user = await userService.getUserById(userId);
                    customerId = user.stripeCustomerId;
                } catch (error) {
                    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
                    return res.status(404).json({
                        success: false,
                        message: 'Utilisateur non trouvé ou sans ID client Stripe'
                    });
                }
            }

            // Vérifier si l'ID client est disponible
            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID client Stripe requis. Créez d\'abord un client via /api/customers'
                });
            }

            // Créer l'intention de paiement
            const paymentIntent = await stripeService.createPaymentIntent({
                amount,
                currency: currency || 'eur',
                customerId,
                paymentMethodId,
                description,
                userId,
                metadata
            });

            // Enregistrer le paiement dans la base de données
            const payment = new Payment({
                userId,
                stripePaymentId: paymentIntent.id,
                amount,
                currency: currency || 'eur',
                status: paymentIntent.status,
                paymentMethod: paymentMethodId,
                description,
                metadata
            });

            await payment.save();

            return res.status(201).json({
                success: true,
                message: 'Intention de paiement créée',
                data: {
                    paymentId: payment._id,
                    clientSecret: paymentIntent.client_secret,
                    status: paymentIntent.status
                }
            });
        } catch (error) {
            console.error('Erreur lors de la création du paiement:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la création du paiement',
                error: error.message
            });
        }
    }

    /**
     * Confirme un paiement
     * @param {Object} req - Requête HTTP
     * @param {Object} res - Réponse HTTP
     * @returns {Promise<Object>} - Résultat de la confirmation
     */
    async confirmPayment(req, res) {
        try {
            const { paymentIntentId } = req.params;

            if (!paymentIntentId) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'ID de l\'intention de paiement est requis'
                });
            }

            // Confirmer le paiement avec Stripe
            const confirmedPayment = await stripeService.confirmPayment(paymentIntentId);

            // Mettre à jour le statut du paiement dans la base de données
            const payment = await Payment.findOneAndUpdate(
                { stripePaymentId: paymentIntentId },
                { status: confirmedPayment.status },
                { new: true }
            );

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Paiement non trouvé'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Paiement confirmé',
                data: {
                    paymentId: payment._id,
                    status: payment.status
                }
            });
        } catch (error) {
            console.error('Erreur lors de la confirmation du paiement:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la confirmation du paiement',
                error: error.message
            });
        }
    }

    /**
     * Récupère les détails d'un paiement
     * @param {Object} req - Requête HTTP
     * @param {Object} res - Réponse HTTP
     * @returns {Promise<Object>} - Détails du paiement
     */
    async getPayment(req, res) {
        try {
            const { paymentId } = req.params;

            const payment = await Payment.findById(paymentId);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Paiement non trouvé'
                });
            }

            // Vérifier si l'utilisateur est autorisé à accéder à ce paiement
            if (payment.userId !== (req.body.userId || req.user.id) && !req.user.isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Accès non autorisé'
                });
            }

            return res.status(200).json({
                success: true,
                data: payment
            });
        } catch (error) {
            console.error('Erreur lors de la récupération du paiement:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du paiement',
                error: error.message
            });
        }
    }

    /**
     * Récupère l'historique des paiements d'un utilisateur
     * @param {Object} req - Requête HTTP
     * @param {Object} res - Réponse HTTP
     * @returns {Promise<Object>} - Historique des paiements
     */
    async getUserPayments(req, res) {
        try {
            const userId = req.params.userId || req.user.id;
            const { page = 1, limit = 10, status } = req.query;

            const query = { userId };

            if (status) {
                query.status = status;
            }

            const options = {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                sort: { createdAt: -1 }
            };

            const payments = await Payment.find(query)
                .skip((options.page - 1) * options.limit)
                .limit(options.limit)
                .sort(options.sort);

            const total = await Payment.countDocuments(query);

            return res.status(200).json({
                success: true,
                data: {
                    payments,
                    pagination: {
                        total,
                        page: options.page,
                        limit: options.limit,
                        pages: Math.ceil(total / options.limit)
                    }
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des paiements:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des paiements',
                error: error.message
            });
        }
    }

    /**
     * Effectue un remboursement
     * @param {Object} req - Requête HTTP
     * @param {Object} res - Réponse HTTP
     * @returns {Promise<Object>} - Résultat du remboursement
     */
    async refundPayment(req, res) {
        try {
            const { paymentId } = req.params;
            const { amount, reason } = req.body;

            const payment = await Payment.findById(paymentId);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Paiement non trouvé'
                });
            }

            // Vérifier si le paiement peut être remboursé
            if (payment.status !== 'succeeded') {
                return res.status(400).json({
                    success: false,
                    message: 'Seuls les paiements réussis peuvent être remboursés'
                });
            }

            // Effectuer le remboursement avec Stripe
            const refund = await stripeService.createRefund(payment.stripePaymentId, amount);

            // Mettre à jour le statut du paiement
            payment.status = 'refunded';
            await payment.save();

            // Mettre à jour la facture associée si elle existe
            if (payment.invoiceId) {
                await Invoice.findByIdAndUpdate(payment.invoiceId, {
                    status: 'void'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Remboursement effectué',
                data: {
                    refundId: refund.id,
                    amount: refund.amount / 100,
                    status: refund.status
                }
            });
        } catch (error) {
            console.error('Erreur lors du remboursement:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors du remboursement',
                error: error.message
            });
        }
    }

    /**
     * Crée une session de paiement Checkout
     * @param {Object} req - Requête HTTP
     * @param {Object} res - Réponse HTTP
     * @returns {Promise<Object>} - URL de la session
     */
    async createCheckoutSession(req, res) {
        try {
            const { items, successUrl, cancelUrl, mode = 'payment', stripeCustomerId } = req.body;
            const userId = req.body.userId || (req.user ? req.user.id : 'user123');

            // Vérifier les données requises
            if (!items || !items.length || !successUrl || !cancelUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'Les articles, l\'URL de succès et l\'URL d\'annulation sont requis'
                });
            }

            let customerId = stripeCustomerId;

            // Si pas de customerId direct, chercher l'utilisateur
            if (!customerId) {
                try {
                    const user = await userService.getUserById(userId);
                    customerId = user.stripeCustomerId;
                } catch (error) {
                    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
                    return res.status(404).json({
                        success: false,
                        message: 'Utilisateur non trouvé'
                    });
                }
            }

            // Vérifier si l'ID client est disponible
            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID client Stripe requis'
                });
            }

            // Formater les articles pour Stripe
            const lineItems = items.map(item => ({
                price: item.priceId,
                quantity: item.quantity || 1
            }));

            // Créer la session de paiement
            const session = await stripeService.createCheckoutSession({
                lineItems,
                successUrl,
                cancelUrl,
                customerId,
                userId,
                mode
            });

            return res.status(200).json({
                success: true,
                url: session.url
            });
        } catch (error) {
            console.error('Erreur lors de la création de la session de paiement:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la création de la session de paiement',
                error: error.message
            });
        }
    }
}

module.exports = new PaymentController();