// Quick script to recalculate audit prices
// Run with: node RECALCULATE_PRICES.js

const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000';
const TOKEN = 'YOUR_TOKEN_HERE'; // Replace with your actual token

async function recalculatePrices() {
  console.log('🔄 Starting price recalculation...\n');

  try {
    // Call the recalculate API
    const response = await fetch(`${API_URL}/api/audits/latest/recalculate-prices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', response.status, error);
      return;
    }

    const result = await response.json();

    console.log('✅ Recalculation Complete!\n');
    console.log('Results:');
    console.log('  - Items Updated:', result.items_updated);
    console.log('  - Old Total Value: ₹' + result.old_total_value.toFixed(2));
    console.log('  - New Total Value: ₹' + result.new_total_value.toFixed(2));
    console.log('  - Value Change: ₹' + result.value_change.toFixed(2));
    console.log('\n✅ Done! Refresh your audit page to see updated prices.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure server is running on port 5000');
    console.log('2. Replace TOKEN with your actual auth token');
    console.log('3. Make sure you have ADMIN or SUPER_ADMIN role');
  }
}

// Run it
recalculatePrices();
