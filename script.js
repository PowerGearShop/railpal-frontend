/*
  RailPal.AI Front‑End Script
  This script powers the scanning, parsing and display logic for RailPal's improved dashboard. It
  leverages Tesseract.js for client‑side OCR to extract text from uploaded images, stores work order
  data locally during the session, matches track lists against stored work orders and generates a
  live results table. Users can then download the matched list as a CSV file. The camera input is
  enabled through the `capture` attribute on file inputs.
*/

// Load Tesseract from CDN if it's not already loaded
// We'll assume tesseract.js is loaded via script tag in HTML

// Global arrays to hold parsed data
let workOrders = [];
let inventoryList = [];

// Utility: Show a status message
function showStatus(message) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.display = 'block';
  }
}

function hideStatus() {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.style.display = 'none';
  }
}

// Convert table data to CSV and trigger download
function downloadCSV(filename = 'railpal_results.csv') {
  const table = document.getElementById('resultsTable');
  if (!table) return;
  let csv = '';
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    const cols = row.querySelectorAll('th, td');
    const rowData = Array.from(cols).map(col => '"' + col.textContent.replace(/\n/g, ' ').trim() + '"');
    csv += rowData.join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// OCR function: reads an image file and returns extracted text
async function extractText(file) {
  if (!file) return '';
  showStatus('Processing image…');
  const { createWorker } = Tesseract;
  const worker = await createWorker({ logger: m => console.log(m) });
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data } = await worker.recognize(file);
  await worker.terminate();
  hideStatus();
  return data.text;
}

// Parse work order text to extract car numbers and spot codes
function parseWorkOrders(text) {
  const orders = [];
  const lines = text.split(/\n+/);
  const carRegex = /[A-Z]{3,5}\d{4,6}/g;
  const spotRegex = /\b\d+[-]\d+\b/;
  lines.forEach(line => {
    const carMatch = line.match(carRegex);
    if (carMatch) {
      carMatch.forEach(car => {
        const spotMatch = line.match(spotRegex);
        orders.push({ car: car.replace(/\s+/g, ''), spot: spotMatch ? spotMatch[0] : '' });
      });
    }
  });
  return orders;
}

// Parse inventory text to extract car numbers and store extra fields as needed
function parseInventoryList(text) {
  const list = [];
  const lines = text.split(/\n+/);
  const carRegex = /[A-Z]{3,5}\d{4,6}/g;
  lines.forEach(line => {
    const carMatch = line.match(carRegex);
    if (carMatch) {
      carMatch.forEach(car => {
        list.push({ car: car.replace(/\s+/g, ''), raw: line.trim() });
      });
    }
  });
  return list;
}

// Display work orders in a simple list for user confirmation
function displayWorkOrders() {
  const container = document.getElementById('workOrdersList');
  if (!container) return;
  container.innerHTML = '';
  if (workOrders.length === 0) {
    container.textContent = 'No work orders loaded.';
    return;
  }
  const ul = document.createElement('ul');
  workOrders.forEach(order => {
    const li = document.createElement('li');
    li.textContent = `${order.car} — Spot ${order.spot || 'N/A'}`;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

// Display matched results in a table
function displayResults() {
  const tableContainer = document.getElementById('resultsTableContainer');
  const table = document.getElementById('resultsTable');
  if (!table) return;
  table.innerHTML = '';
  // Build header
  const header = document.createElement('tr');
  ['Car Number', 'Spot', 'Matched'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    header.appendChild(th);
  });
  table.appendChild(header);
  if (inventoryList.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = 'No inventory list scanned yet.';
    row.appendChild(cell);
    table.appendChild(row);
    return;
  }
  inventoryList.forEach(item => {
    const row = document.createElement('tr');
    const carTd = document.createElement('td');
    carTd.textContent = item.car;
    const match = workOrders.find(order => order.car === item.car);
    const spotTd = document.createElement('td');
    spotTd.textContent = match ? match.spot : '';
    const matchedTd = document.createElement('td');
    matchedTd.textContent = match ? 'Yes' : 'No';
    if (match) {
      row.classList.add('highlight');
    }
    row.appendChild(carTd);
    row.appendChild(spotTd);
    row.appendChild(matchedTd);
    table.appendChild(row);
  });
  // Show download button if there are results
  const downloadBtn = document.getElementById('downloadCsvBtn');
  if (downloadBtn) {
    downloadBtn.style.display = inventoryList.length > 0 ? 'inline-block' : 'none';
  }
}

// Handle work order file input
async function handleWorkOrderUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await extractText(file);
  const parsed = parseWorkOrders(text);
  // Merge new orders with existing, replacing duplicates
  parsed.forEach(order => {
    const existing = workOrders.find(o => o.car === order.car);
    if (existing) {
      existing.spot = order.spot || existing.spot;
    } else {
      workOrders.push(order);
    }
  });
  displayWorkOrders();
}

// Handle inventory file input
async function handleInventoryUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await extractText(file);
  inventoryList = parseInventoryList(text);
  displayResults();
}

// Attach event listeners on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const workOrderInput = document.getElementById('workOrderInput');
  const inventoryInput = document.getElementById('inventoryInput');
  const downloadBtn = document.getElementById('downloadCsvBtn');
  if (workOrderInput) {
    workOrderInput.addEventListener('change', handleWorkOrderUpload);
  }
  if (inventoryInput) {
    inventoryInput.addEventListener('change', handleInventoryUpload);
  }
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => downloadCSV());
  }

  // Payment buttons for pricing page
  const subscribeBtn = document.getElementById('subscribeBtn');
  const creditsBtn = document.getElementById('creditsBtn');
  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', () => createCheckoutSession('price_monthly'));
  }
  if (creditsBtn) {
    creditsBtn.addEventListener('click', () => createCheckoutSession('price_credits'));
  }
});

// Create Stripe checkout session via backend
async function createCheckoutSession(priceId) {
  if (!priceId) return;
  try {
    showStatus('Redirecting to payment…');
    const response = await fetch('https://railpal-backend.onrender.com/api/payment/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });
    const data = await response.json();
    hideStatus();
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      alert('Unable to initiate checkout session.');
    }
  } catch (error) {
    hideStatus();
    console.error(error);
    alert('There was an error creating a checkout session.');
  }
}
