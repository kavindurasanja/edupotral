import emailjs from '@emailjs/browser';

// To make this 100% free, you need to sign up at https://www.emailjs.com/
// Create an Email Service, an Email Template, and get your Public Key.
// Add these to your .env file:
// VITE_EMAILJS_SERVICE_ID=your_service_id
// VITE_EMAILJS_TEMPLATE_ID=your_template_id
// VITE_EMAILJS_PUBLIC_KEY=your_public_key

export const sendPaymentEmail = async (
  toEmail: string,
  toName: string,
  status: 'confirmed' | 'rejected',
  amount: number,
  courseName: string
) => {
  try {
   const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_imlqe7i';
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'service_imlqe7i';
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '9qphbHwpfD1IDbjyT';

    if (!serviceId || !templateId || !publicKey) {
      console.warn("EmailJS credentials not found. Email not sent.");
      return;
    }

    const templateParams = {
      to_email: toEmail,
      to_name: toName,
      status: status === 'confirmed' ? 'Approved' : 'Rejected',
      amount: amount.toLocaleString(),
      course_name: courseName,
      message: status === 'confirmed' 
        ? 'Great news! Your payment has been successfully verified and approved. Your registration is now complete.'
        : 'Unfortunately, your payment receipt was rejected. Please check the receipt and try uploading again, or contact support for assistance.'
    };

    await emailjs.send(serviceId, templateId, templateParams, publicKey);
    console.log("Email sent successfully to", toEmail);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
};
