const stripeService = require('../services/stripe.service');
const emailService = require('../services/email.service');
const userService = require('../services/user.service');
const Payment = require('../models/payment.model');
const Subscription = require('../models/subscription.model');
const Invoice = require('../models/invoice.model');

/**
 * Contrôleur pour gérer les webhooks Stripe
 */
class WebhookController {
  /**
   * Traite les événements webhooks de Stripe
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP
   * @returns {Promise<Object>} - Confirmation de traitement
   */
  async handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.rawBody;
    
    if (!sig || !rawBody) {
      return res.status(400).json({
        success: false,
        message: 'Signature manquante ou corps de requête invalide'
      });
    }
    
    let event;
    
    try {
      event = stripeService.constructWebhookEvent(rawBody, sig);
    } catch (error) {
      console.error('Erreur lors de la vérification de la signature webhook:', error);
      return res.status(400).json({
        success: false,
        message: 'Signature de webhook invalide'
      });
    }
    
    // Traitement en fonction du type d'événement
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
          
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
          
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
          
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
          
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
          
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
          
        default:
          console.log(`Événement Stripe non géré: ${event.type}`);
      }
      
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error(`Erreur lors du traitement de l'événement ${event.type}:`, error);
      return res.status(500).json({
        success: false,
        message: `Erreur lors du traitement de l'événement ${event.type}`,
        error: error.message
      });
    }
  }

  /**
   * Gère les paiements réussis
   * @param {Object} paymentIntent - Intention de paiement Stripe
   */
  async handlePaymentIntentSucceeded(paymentIntent) {
    console.log('Paiement réussi:', paymentIntent.id);
    
    try {
      // Mettre à jour le paiement dans la base de données
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentId: paymentIntent.id },
        { 
          status: 'succeeded',
          metadata: {
            ...paymentIntent.metadata
          }
        },
        { new: true }
      );
      
      if (!payment) {
        console.warn(`Paiement non trouvé pour l'intention ${paymentIntent.id}`);
        return;
      }
      
      // Si le paiement est lié à une facture, marquer la facture comme payée
      if (payment.invoiceId) {
        await Invoice.findByIdAndUpdate(payment.invoiceId, {
          status: 'paid',
          amountPaid: paymentIntent.amount / 100,
          paymentIntentId: paymentIntent.id
        });
      }
      
      // Récupérer l'utilisateur pour envoyer une notification
      const userId = payment.userId || paymentIntent.metadata.userId;
      if (userId) {
        try {
          const user = await userService.getUserById(userId);
          
          // Envoyer un email de confirmation
          await emailService.sendEmail({
            to: user.email,
            subject: 'Confirmation de paiement',
            text: `Bonjour ${user.name},\n\nVotre paiement de ${paymentIntent.amount / 100} ${paymentIntent.currency} a été traité avec succès.\n\nMerci pour votre confiance.\n\nL'équipe`,
            html: `
              <h2>Confirmation de paiement</h2>
              <p>Bonjour ${user.name},</p>
              <p>Votre paiement de <strong>${paymentIntent.amount / 100} ${paymentIntent.currency}</strong> a été traité avec succès.</p>
              <p>Merci pour votre confiance.</p>
              <p>L'équipe</p>
            `
          });
        } catch (error) {
          console.error('Erreur lors de la récupération de l\'utilisateur ou de l\'envoi d\'email:', error);
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement du paiement réussi:', error);
      throw error;
    }
  }

  /**
   * Gère les paiements échoués
   * @param {Object} paymentIntent - Intention de paiement Stripe
   */
  async handlePaymentIntentFailed(paymentIntent) {
    console.log('Paiement échoué:', paymentIntent.id);
    
    try {
      // Mettre à jour le paiement dans la base de données
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentId: paymentIntent.id },
        { 
          status: 'failed',
          metadata: {
            ...paymentIntent.metadata,
            lastError: paymentIntent.last_payment_error?.message
          }
        },
        { new: true }
      );
      
      if (!payment) {
        console.warn(`Paiement non trouvé pour l'intention ${paymentIntent.id}`);
        return;
      }
      
      // Récupérer l'utilisateur pour envoyer une notification
      const userId = payment.userId || paymentIntent.metadata.userId;
      if (userId) {
        try {
          const user = await userService.getUserById(userId);
          
          // Envoyer un email d'échec de paiement
          await emailService.sendPaymentFailedEmail({
            customerEmail: user.email,
            customerName: user.name,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            updatePaymentLink: `${process.env.FRONTEND_URL}/account/payment-methods`
          });
        } catch (error) {
          console.error('Erreur lors de la récupération de l\'utilisateur ou de l\'envoi d\'email:', error);
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement du paiement échoué:', error);
      throw error;
    }
  }

  /**
   * Gère la création d'abonnement
   * @param {Object} subscription - Abonnement Stripe
   */
  async handleSubscriptionCreated(subscription) {
    console.log('Abonnement créé:', subscription.id);
    
    try {
      // Vérifier si l'abonnement existe déjà dans la base de données
      const existingSubscription = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
      
      if (existingSubscription) {
        console.log(`Abonnement ${subscription.id} déjà enregistré`);
        return;
      }
      
      // Récupérer l'ID utilisateur depuis les métadonnées
      const userId = subscription.metadata?.userId;
      if (!userId) {
        console.warn(`Abonnement ${subscription.id} sans ID utilisateur dans les métadonnées`);
        return;
      }
      
      // Créer l'abonnement dans la base de données
      const newSubscription = new Subscription({
        userId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        planId: subscription.items.data[0]?.price.id,
        planName: subscription.items.data[0]?.price.nickname || 'Plan standard',
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        paymentMethod: subscription.default_payment_method,
        latestInvoice: subscription.latest_invoice
      });
      
      await newSubscription.save();
      
      // Mettre à jour le statut d'abonnement de l'utilisateur
      try {
        await userService.updateUserSubscription(userId, {
          subscriptionId: newSubscription._id,
          subscriptionStatus: subscription.status,
          subscriptionEndDate: new Date(subscription.current_period_end * 1000),
          subscriptionType: newSubscription.planName
        });
      } catch (error) {
        console.error('Erreur lors de la mise à jour du statut d\'abonnement utilisateur:', error);
      }
      
      // Si l'abonnement est actif, envoyer un email de confirmation
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        try {
          const user = await userService.getUserById(userId);
          
          await emailService.sendSubscriptionStartEmail({
            customerEmail: user.email,
            customerName: user.name,
            planName: newSubscription.planName,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
          });
        } catch (error) {
          console.error('Erreur lors de la récupération de l\'utilisateur ou de l\'envoi d\'email:', error);
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement de la création d\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Gère la mise à jour d'abonnement
   * @param {Object} subscription - Abonnement Stripe
   */
  async handleSubscriptionUpdated(subscription) {
    console.log('Abonnement mis à jour:', subscription.id);
    
    try {
      // Trouver l'abonnement dans la base de données
      const existingSubscription = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
      
      if (!existingSubscription) {
        console.warn(`Abonnement ${subscription.id} non trouvé pour la mise à jour`);
        return;
      }
      
      // Mettre à jour l'abonnement
      existingSubscription.status = subscription.status;
      existingSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      existingSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      existingSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
      existingSubscription.paymentMethod = subscription.default_payment_method || existingSubscription.paymentMethod;
      existingSubscription.latestInvoice = subscription.latest_invoice || existingSubscription.latestInvoice;
      
      if (subscription.cancel_at) {
        existingSubscription.canceledAt = new Date(subscription.cancel_at * 1000);
      }
      
      await existingSubscription.save();
      
      // Mettre à jour le statut d'abonnement de l'utilisateur
      try {
        await userService.updateUserSubscription(existingSubscription.userId, {
          subscriptionStatus: subscription.status,
          subscriptionEndDate: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        });
      } catch (error) {
        console.error('Erreur lors de la mise à jour du statut d\'abonnement utilisateur:', error);
      }
      
      // Gérer les différents cas de mise à jour
      if (subscription.status === 'active' && existingSubscription.status !== 'active') {
        // L'abonnement vient d'être activé
        try {
          const user = await userService.getUserById(existingSubscription.userId);
          
          await emailService.sendSubscriptionStartEmail({
            customerEmail: user.email,
            customerName: user.name,
            planName: existingSubscription.planName,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
          });
        } catch (error) {
          console.error('Erreur lors de la récupération de l\'utilisateur ou de l\'envoi d\'email:', error);
        }
      } else if (subscription.status === 'canceled' && existingSubscription.status !== 'canceled') {
        // L'abonnement vient d'être annulé
        try {
          const user = await userService.getUserById(existingSubscription.userId);
          
          await emailService.sendEmail({
            to: user.email,
            subject: 'Annulation d\'abonnement',
            text: `Bonjour ${user.name},\n\nVotre abonnement au plan ${existingSubscription.planName} a été annulé. Vous pouvez continuer à utiliser les services jusqu'au ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}.\n\nNous espérons vous revoir bientôt.\n\nL'équipe`,
            html: `
              <h2>Annulation d'abonnement</h2>
              <p>Bonjour ${user.name},</p>
              <p>Votre abonnement au plan <strong>${existingSubscription.planName}</strong> a été annulé.</p>
              <p>Vous pouvez continuer à utiliser les services jusqu'au <strong>${new Date(subscription.current_period_end * 1000).toLocaleDateString()}</strong>.</p>
              <p>Nous espérons vous revoir bientôt.</p>
              <p>L'équipe</p>
            `
          });
        } catch (error) {
          console.error('Erreur lors de la récupération de l\'utilisateur ou de l\'envoi d\'email:', error);
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement de la mise à jour d\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Gère la suppression d'abonnement
   * @param {Object} subscription - Abonnement Stripe
   */
  async handleSubscriptionDeleted(subscription) {
    console.log('Abonnement supprimé:', subscription.id);
    
    try {
      // Trouver l'abonnement dans la base de données
      const existingSubscription = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
      
      if (!existingSubscription) {
        console.warn(`Abonnement ${subscription.id} non trouvé pour la suppression`);
        return;
      }
      
      // Mettre à jour l'abonnement comme supprimé
      existingSubscription.status = 'canceled';
      existingSubscription.canceledAt = new Date();
      await existingSubscription.save();
      
      // Mettre à jour le statut d'abonnement de l'utilisateur
      try {
        await userService.updateUserSubscription(existingSubscription.userId, {
          subscriptionStatus: 'canceled',
          subscriptionEndDate: existingSubscription.currentPeriodEnd
        });
      } catch (error) {
        console.error('Erreur lors de la mise à jour du statut d\'abonnement utilisateur:', error);
      }
      
      // Informer l'utilisateur de la suppression de l'abonnement
      try {
        const user = await userService.getUserById(existingSubscription.userId);
        
        await emailService.sendEmail({
          to: user.email,
          subject: 'Fin d\'abonnement',
          text: `Bonjour ${user.name},\n\nVotre abonnement au plan ${existingSubscription.planName} est maintenant terminé. Nous espérons vous revoir bientôt.\n\nL'équipe`,
          html: `
            <h2>Fin d'abonnement</h2>
            <p>Bonjour ${user.name},</p>
            <p>Votre abonnement au plan <strong>${existingSubscription.planName}</strong> est maintenant terminé.</p>
            <p>Nous espérons vous revoir bientôt.</p>
            <p>L'équipe</p>
          `
        });
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur ou de l\'envoi d\'email:', error);
      }
    } catch (error) {
      console.error('Erreur lors du traitement de la suppression d\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Gère le paiement réussi d'une facture
   * @param {Object} invoice - Facture Stripe
   */
  async handleInvoicePaymentSucceeded(invoice) {
    console.log('Paiement de facture réussi:', invoice.id);
    
    try {
      // Trouver la facture dans la base de données
      const existingInvoice = await Invoice.findOne({ stripeInvoiceId: invoice.id });
      
      if (existingInvoice) {
        // Mettre à jour la facture
        existingInvoice.status = 'paid';
        existingInvoice.amountPaid = invoice.amount_paid / 100;
        existingInvoice.paymentIntentId = invoice.payment_intent;
        
        await existingInvoice.save();
      } else {
        // Créer une nouvelle facture dans la base de données
        // Récupérer l'ID utilisateur depuis le customer
        let userId = null;
        if (invoice.subscription) {
          const subscription = await Subscription.findOne({ stripeSubscriptionId: invoice.subscription });
          if (subscription) {
            userId = subscription.userId;
          }
        }
        
        if (!userId && invoice.customer_email) {
          // Tenter de trouver l'utilisateur par email (nécessite service utilisateur)
          try {
            const userResponse = await axios.get(`${process.env.USER_SERVICE_URL}/by-email/${invoice.customer_email}`);
            if (userResponse.data && userResponse.data.id) {
              userId = userResponse.data.id;
            }
          } catch (error) {
            console.error('Erreur lors de la récupération de l\'utilisateur par email:', error);
          }
        }
        
        if (!userId) {
          console.warn(`Impossible de déterminer l'utilisateur pour la facture ${invoice.id}`);
          return;
        }
        
        // Créer la facture
        const newInvoice = new Invoice({
          userId,
          stripeInvoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          amount: invoice.total / 100,
          amountPaid: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: 'paid',
          pdfUrl: invoice.invoice_pdf,
          paymentIntentId: invoice.payment_intent,
          periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
          periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
          items: invoice.lines.data.map(item => ({
            description: item.description,
            amount: item.amount / 100,
            quantity: item.quantity
          }))
        });
        
        await newInvoice.save();
        
        // Tenter d'envoyer la facture par email
        try {
          const user = await userService.getUserById(userId);
          
          await emailService.sendInvoiceEmail({
            invoiceNumber: invoice.number || invoice.id,
            customerEmail: user.email,
            customerName: user.name,
            amount: invoice.total / 100,
            currency: invoice.currency,
            createdAt: new Date(invoice.created * 1000),
            status: 'paid',
            pdfUrl: invoice.invoice_pdf
          });
          
          // Marquer la facture comme envoyée
          newInvoice.emailSent = true;
          newInvoice.emailSentAt = new Date();
          await newInvoice.save();
        } catch (error) {
          console.error('Erreur lors de l\'envoi de l\'email de facture:', error);
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement du paiement de facture réussi:', error);
      throw error;
    }
  }

  /**
   * Gère le paiement échoué d'une facture
   * @param {Object} invoice - Facture Stripe
   */
  async handleInvoicePaymentFailed(invoice) {
    console.log('Paiement de facture échoué:', invoice.id);
    
    try {
      // Trouver la facture dans la base de données
      const existingInvoice = await Invoice.findOne({ stripeInvoiceId: invoice.id });
      
      if (existingInvoice) {
        // Mettre à jour la facture
        existingInvoice.status = 'uncollectible';
        
        await existingInvoice.save();
        
        // Trouver l'abonnement associé et mettre à jour son statut
        if (existingInvoice.subscriptionId) {
          const subscription = await Subscription.findOne({ stripeSubscriptionId: existingInvoice.subscriptionId });
          
          if (subscription) {
            subscription.status = 'past_due';
            await subscription.save();
            
            // Mettre à jour le statut d'abonnement de l'utilisateur
            try {
              await userService.updateUserSubscription(subscription.userId, {
                subscriptionStatus: 'past_due'
              });
            } catch (error) {
              console.error('Erreur lors de la mise à jour du statut d\'abonnement utilisateur:', error);
            }
            
            // Envoyer un email d'échec de paiement
            try {
              const user = await userService.getUserById(subscription.userId);
              
              await emailService.sendPaymentFailedEmail({
                customerEmail: user.email,
                customerName: user.name,
                amount: existingInvoice.amount,
                currency: existingInvoice.currency,
                updatePaymentLink: `${process.env.FRONTEND_URL}/account/payment-methods`
              });
            } catch (error) {
              console.error('Erreur lors de la récupération de l\'utilisateur ou de l\'envoi d\'email:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement du paiement de facture échoué:', error);
      throw error;
    }
  }
}

module.exports = new WebhookController();