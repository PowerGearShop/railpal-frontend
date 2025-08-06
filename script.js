document.addEventListener('DOMContentLoaded', () => {
  // Handle login form submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      // For demonstration: show alert and redirect
      alert('Logged in successfully!');
      window.location.href = 'dashboard.html';
    });
  }

  // Handle file upload and OCR
  const uploadForm = document.getElementById('upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('fileInput');
      const resultsDiv = document.getElementById('ocrResults');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Please select a file to upload.');
        return;
      }
      const formData = new FormData();
      formData.append('image', fileInput.files[0]);

      resultsDiv.textContent = 'Processing...';

      try {
        const response = await fetch('https://railpal-backend.onrender.com/api/ocr/upload', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        if (data.extractedText) {
          resultsDiv.textContent = data.extractedText;
        } else {
          resultsDiv.textContent = JSON.stringify(data, null, 2);
        }
      } catch (error) {
        resultsDiv.textContent = 'Error: ' + error.message;
      }
    });
  }

  // Payment: subscription and credits
  async function createCheckoutSession(priceId) {
    try {
      const response = await fetch('https://railpal-backend.onrender.com/api/payment/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priceId })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout session creation failed.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  const subscribeBtn = document.getElementById('subscribeBtn');
  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', () => {
      createCheckoutSession('price-monthly');
    });
  }

  const creditsBtn = document.getElementById('creditsBtn');
  if (creditsBtn) {
    creditsBtn.addEventListener('click', () => {
      createCheckoutSession('price-credits');
    });
  }
});
