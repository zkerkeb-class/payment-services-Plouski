const nodemailer = require('nodemailer');

/**
 * Service pour gérer l'envoi d'emails avec Nodemailer
 */
class EmailService {
  constructor() {
    // Création du transporteur Nodemailer
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Envoie un email
   * @param {Object} emailData - Données de l'email
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async sendEmail(emailData) {
    try {
      const mailOptions = {
        from: emailData.from || process.env.EMAIL_FROM,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        attachments: emailData.attachments || []
      };
      
      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw error;
    }
  }

  /**
   * Envoie une facture par email
   * @param {Object} invoiceData - Données de la facture
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async sendInvoiceEmail(invoiceData) {
    try {
      const attachments = [];
      
      if (invoiceData.pdfUrl) {
        attachments.push({
          filename: `facture-${invoiceData.invoiceNumber}.pdf`,
          path: invoiceData.pdfContent || invoiceData.pdfUrl
        });
      }
      
      const emailData = {
        to: invoiceData.customerEmail,
        subject: `Votre facture #${invoiceData.invoiceNumber}`,
        text: `Bonjour ${invoiceData.customerName},\n\nVeuillez trouver ci-joint votre facture #${invoiceData.invoiceNumber} d'un montant de ${invoiceData.amount} ${invoiceData.currency}.\n\nMerci pour votre confiance.\n\nL'équipe`,
        html: `
          <h2>Facture #${invoiceData.invoiceNumber}</h2>
          <p>Bonjour ${invoiceData.customerName},</p>
          <p>Veuillez trouver ci-joint votre facture d'un montant de <strong>${invoiceData.amount} ${invoiceData.currency}</strong>.</p>
          <p>Date de facturation: ${new Date(invoiceData.createdAt).toLocaleDateString()}</p>
          <p>Statut: ${invoiceData.status}</p>
          ${invoiceData.pdfUrl ? `<p>Vous pouvez également <a href="${invoiceData.pdfUrl}">télécharger votre facture ici</a>.</p>` : ''}
          <p>Merci pour votre confiance.</p>
          <p>L'équipe</p>
        `,
        attachments
      };
      
      return await this.sendEmail(emailData);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de facture:', error);
      throw error;
    }
  }

  /**
   * Envoie une notification de début d'abonnement
   * @param {Object} subscriptionData - Données de l'abonnement
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async sendSubscriptionStartEmail(subscriptionData) {
    try {
      const emailData = {
        to: subscriptionData.customerEmail,
        subject: 'Votre abonnement a commencé',
        text: `Bonjour ${subscriptionData.customerName},\n\nVotre abonnement au plan ${subscriptionData.planName} a été activé avec succès. Votre abonnement est valide jusqu'au ${new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}.\n\nMerci pour votre confiance.\n\nL'équipe`,
        html: `
          <h2>Abonnement activé</h2>
          <p>Bonjour ${subscriptionData.customerName},</p>
          <p>Votre abonnement au plan <strong>${subscriptionData.planName}</strong> a été activé avec succès.</p>
          <p>Votre abonnement est valide jusqu'au <strong>${new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}</strong>.</p>
          <p>Merci pour votre confiance.</p>
          <p>L'équipe</p>
        `
      };
      
      return await this.sendEmail(emailData);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de début d\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Envoie une notification de fin d'abonnement
   * @param {Object} subscriptionData - Données de l'abonnement
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async sendSubscriptionEndingEmail(subscriptionData) {
    try {
      const emailData = {
        to: subscriptionData.customerEmail,
        subject: 'Votre abonnement se termine bientôt',
        text: `Bonjour ${subscriptionData.customerName},\n\nVotre abonnement au plan ${subscriptionData.planName} se termine le ${new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}. Pour continuer à bénéficier de nos services, veuillez renouveler votre abonnement.\n\nMerci pour votre confiance.\n\nL'équipe`,
        html: `
          <h2>Abonnement se terminant bientôt</h2>
          <p>Bonjour ${subscriptionData.customerName},</p>
          <p>Votre abonnement au plan <strong>${subscriptionData.planName}</strong> se termine le <strong>${new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}</strong>.</p>
          <p>Pour continuer à bénéficier de nos services, veuillez renouveler votre abonnement.</p>
          <p><a href="${subscriptionData.renewalLink || '#'}">Renouveler mon abonnement</a></p>
          <p>Merci pour votre confiance.</p>
          <p>L'équipe</p>
        `
      };
      
      return await this.sendEmail(emailData);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de fin d\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Envoie une notification d'échec de paiement
   * @param {Object} paymentData - Données du paiement
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async sendPaymentFailedEmail(paymentData) {
    try {
      const emailData = {
        to: paymentData.customerEmail,
        subject: 'Échec de paiement',
        text: `Bonjour ${paymentData.customerName},\n\nNous n'avons pas pu traiter votre paiement de ${paymentData.amount} ${paymentData.currency}. Veuillez mettre à jour vos informations de paiement pour éviter l'interruption de service.\n\nL'équipe`,
        html: `
          <h2>Échec de paiement</h2>
          <p>Bonjour ${paymentData.customerName},</p>
          <p>Nous n'avons pas pu traiter votre paiement de <strong>${paymentData.amount} ${paymentData.currency}</strong>.</p>
          <p>Veuillez mettre à jour vos informations de paiement pour éviter l'interruption de service.</p>
          <p><a href="${paymentData.updatePaymentLink || '#'}">Mettre à jour mes informations de paiement</a></p>
          <p>L'équipe</p>
        `
      };
      
      return await this.sendEmail(emailData);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email d\'échec de paiement:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();