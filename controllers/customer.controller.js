const stripeService = require('../services/stripe.service');

/**
 * Contrôleur pour gérer les clients Stripe (pour les tests)
 */
class CustomerController {
  /**
   * Crée un client Stripe
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP
   * @returns {Promise<Object>} - Client créé
   */
  async createCustomer(req, res) {
    try {
      const { email, name, metadata } = req.body;
      
      // Vérifier les données requises
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'L\'email est requis'
        });
      }
      
      // Créer le client dans Stripe
      const customer = await stripeService.createCustomer({
        email,
        name: name || email.split('@')[0],
        metadata: {
          ...metadata,
          userId: req.body.userId || 'user123'
        }
      });
      
      return res.status(201).json({
        success: true,
        message: 'Client Stripe créé',
        data: {
          customerId: customer.id,
          email: customer.email,
          name: customer.name
        }
      });
    } catch (error) {
      console.error('Erreur lors de la création du client Stripe:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du client Stripe',
        error: error.message
      });
    }
  }

  /**
   * Récupère un client Stripe
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP
   * @returns {Promise<Object>} - Détails du client
   */
  async getCustomer(req, res) {
    try {
      const { customerId } = req.params;
      
      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'L\'ID du client est requis'
        });
      }
      
      // Récupérer le client depuis Stripe
      const customer = await stripeService.getCustomer(customerId);
      
      return res.status(200).json({
        success: true,
        data: customer
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du client Stripe:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du client Stripe',
        error: error.message
      });
    }
  }

  async attachPaymentMethod(req, res) {
    try {
      const { customerId } = req.params;
      const { paymentMethodId } = req.body;
      
      if (!paymentMethodId) {
        return res.status(400).json({
          success: false,
          message: 'ID de méthode de paiement requis'
        });
      }
      
      const paymentMethod = await stripeService.attachPaymentMethod(customerId, paymentMethodId);
      
      return res.status(200).json({
        success: true,
        message: 'Méthode de paiement attachée avec succès',
        data: paymentMethod
      });
    } catch (error) {
      console.error('Erreur lors de l\'attachement de la méthode de paiement:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'attachement de la méthode de paiement',
        error: error.message
      });
    }
  }
}

module.exports = new CustomerController();