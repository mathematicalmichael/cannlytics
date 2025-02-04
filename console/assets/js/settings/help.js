/**
 * Help Settings JavaScript | Cannlytics Console
 * Author: Keegan Skeate
 * Created: 7/13/2021
 * Updated: 7/13/2021
 */

import { auth } from '../firebase.js';
import { authRequest, showNotification } from '../utils.js';


export const helpSettings = {


  sendFeedback() {
    /*
     * Send feedback through Firestore-triggered Google Cloud Function.
     */
    document.getElementById('send-feedback-button').classList.add('d-none');
    document.getElementById('send-feedback-button-loading').classList.remove('d-none');
    const user = auth.currentUser || {};
    const input = document.getElementById('feedback-message');
    const message = input.value
    const timestamp = Date.now().toString(); // Optional: Specify time zone.
    const code = Math.random().toString(36).slice(-3);
    const data = {
      name: user.displayName || 'Anonymous user',
      subject: 'New Cannlytics Console feedback!',
      message: message,
      email: user.email || 'No user',
      organization: user.organization || 'No organization',
      from: 'contact@cannlytics.com',
      reply: 'contact@cannlytics.com',
      recipients: ['contact@cannlytics.com'],
      promo: code,
    };
    authRequest('/send-feedback', { data }).then((response) => {
      // FIXME: Handle response.json() correctly in authRequest.
      // console.log(response);
      // if (response.success) {
      //   const message = 'Thank you for your feedback, your feedback builds the platform.';
      //   showNotification('Feedback sent', message, { type: 'success' });
      //   input.value = '';
      // } else {
      //   showNotification('Unable to send feedback', response.message, { type: 'error' });
      // }
    })
    .finally(() => {
      const message = 'Thank you for your feedback, your feedback builds the platform.';
      showNotification('Feedback sent', message, { type: 'success' });
      input.value = '';
      document.getElementById('send-feedback-button').classList.remove('d-none');
      document.getElementById('send-feedback-button-loading').classList.add('d-none');
    });
  },


};
