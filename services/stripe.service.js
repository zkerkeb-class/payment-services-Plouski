const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Service pour l'intégration avec Stripe
 */
class StripeService {
  /**
   * Crée un client Stripe
   * @param {Object} customerData - Données du client
   * @returns {Promise<Object>} - Client Stripe créé
   */
  async createCustomer(customerData) {
    try {
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        metadata: {
          userId: customerData.userId
        },
        ...customerData
      });
      
      return customer;
    } catch (error) {
      console.error('Erreur lors de la création du client Stripe:', error);
      throw error;
    }
  }

  /**
   * Ajoute une méthode de paiement à un client
   * @param {string} customerId - ID du client Stripe
   * @param {string} paymentMethodId - ID de la méthode de paiement
   * @returns {Promise<Object>} - Méthode de paiement attachée
   */
  async attachPaymentMethod(customerId, paymentMethodId) {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      
      // Définir comme méthode de paiement par défaut
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      return paymentMethod;
    } catch (error) {
      console.error('Erreur lors de l\'attachement de la méthode de paiement:', error);
      throw error;
    }
  }

  /**
   * Crée un abonnement Stripe
   * @param {Object} subscriptionData - Données de l'abonnement
   * @returns {Promise<Object>} - Abonnement créé
   */
  async createSubscription(subscriptionData) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: subscriptionData.customerId,
        items: [
          {
            price: subscriptionData.priceId,
          },
        ],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: subscriptionData.userId
        },
        ...subscriptionData.options
      });
      
      return subscription;
    } catch (error) {
      console.error('Erreur lors de la création de l\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Annule un abonnement
   * @param {string} subscriptionId - ID de l'abonnement
   * @param {boolean} cancelImmediately - Annuler immédiatement ou à la fin de la période
   * @returns {Promise<Object>} - Abonnement mis à jour
   */
  async cancelSubscription(subscriptionId, cancelImmediately = false) {
    try {
      if (cancelImmediately) {
        return await stripe.subscriptions.cancel(subscriptionId);
      } else {
        return await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Récupère un abonnement
   * @param {string} subscriptionId - ID de l'abonnement
   * @returns {Promise<Object>} - Détails de l'abonnement
   */
  async getSubscription(subscriptionId) {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice', 'customer']
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Traite un paiement unique
   * @param {Object} paymentData - Données du paiement
   * @returns {Promise<Object>} - Intention de paiement
   */
  async createPaymentIntent(paymentData) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Conversion en centimes
        currency: paymentData.currency || 'eur',
        customer: paymentData.customerId,
        payment_method: paymentData.paymentMethodId,
        description: paymentData.description,
        metadata: {
          userId: paymentData.userId,
          ...paymentData.metadata
        },
        confirm: paymentData.confirm || false,
        return_url: paymentData.returnUrl
      });
      
      return paymentIntent;
    } catch (error) {
      console.error('Erreur lors de la création de l\'intention de paiement:', error);
      throw error;
    }
  }

  /**
   * Confirme un paiement
   * @param {string} paymentIntentId - ID de l'intention de paiement
   * @returns {Promise<Object>} - Intention de paiement confirmée
   */
  async confirmPayment(paymentIntentId) {
    try {
      return await stripe.paymentIntents.confirm(paymentIntentId);
    } catch (error) {
      console.error('Erreur lors de la confirmation du paiement:', error);
      throw error;
    }
  }

  /**
   * Effectue un remboursement
   * @param {string} paymentIntentId - ID de l'intention de paiement
   * @param {number} amount - Montant à rembourser (en centimes)
   * @returns {Promise<Object>} - Remboursement effectué
   */
  async createRefund(paymentIntentId, amount = null) {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
      };
      
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }
      
      return await stripe.refunds.create(refundData);
    } catch (error) {
      console.error('Erreur lors du remboursement:', error);
      throw error;
    }
  }

  /**
   * Récupère une facture
   * @param {string} invoiceId - ID de la facture
   * @returns {Promise<Object>} - Facture
   */
  async getInvoice(invoiceId) {
    try {
      return await stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      console.error('Erreur lors de la récupération de la facture:', error);
      throw error;
    }
  }

  /**
   * Crée un lien de session de paiement
   * @param {Object} sessionData - Données de la session
   * @returns {Promise<Object>} - Session créée
   */
  async createCheckoutSession(sessionData) {
    try {
      return await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: sessionData.lineItems,
        mode: sessionData.mode || 'payment',
        success_url: sessionData.successUrl,
        cancel_url: sessionData.cancelUrl,
        customer: sessionData.customerId,
        metadata: {
          userId: sessionData.userId,
          ...sessionData.metadata
        }
      });
    } catch (error) {
      console.error('Erreur lors de la création de la session de paiement:', error);
      throw error;
    }
  }

  /**
   * Vérifie la signature d'un webhook Stripe
   * @param {string} payload - Charge utile du webhook
   * @param {string} signature - Signature de l'en-tête
   * @returns {Object} - Événement vérifié
   */
  constructWebhookEvent(payload, signature) {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error('Erreur lors de la vérification du webhook:', error);
      throw error;
    }
  }

  /**
   * Récupère un client Stripe
   * @param {string} customerId - ID du client Stripe
   * @returns {Promise<Object>} - Client Stripe
   */
  async getCustomer(customerId) {
    try {
      return await stripe.customers.retrieve(customerId);
    } catch (error) {
      console.error('Erreur lors de la récupération du client Stripe:', error);
      throw error;
    }
  }
}

module.exports = new StripeService();