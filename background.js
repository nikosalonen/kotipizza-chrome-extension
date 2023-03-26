const API_URL = 'https://apim-kotipizza-ecom-prod.azure-api.net/webshop/v1/restaurants/nearby?type=DELIVERY&coordinates=';

// get coordinates from kotipizza.fi nearby restaurants api
chrome.webRequest.onCompleted.addListener(
  (details) => {

    if (
      details.url.startsWith('https://apim-kotipizza-ecom-prod.azure-api.net/webshop/v1/restaurants/nearby') &&
      details.method === 'GET' &&
      details.statusCode === 200 &&
      details.initiator === "https://www.kotipizza.fi"
    ) {

      //value of coordinates is coords parameter from details.url
      const coordinates = details.url.split('coordinates=')[1];
      chrome.storage.local.set({ coordinates });
    }
  },
  {
    urls: [
      'https://apim-kotipizza-ecom-prod.azure-api.net/webshop/v1/restaurants/nearby?type=DELIVERY&coordinates=*',
    ]
  }
);



function createNotification(restaurant) {
  self.registration.showNotification('Kotipizza Delivery Alert', {
    icon: 'icon128.png',
    body: `${restaurant.displayName} has a delivery fee of ${restaurant.dynamicDeliveryFee} and an estimated delivery time of ${restaurant.currentDeliveryEstimate} minutes.`,
  });
}



async function checkDeliveryFees(coordinates, alertThreshold) {
  const url = `${API_URL}${coordinates}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Fetched data:', data); // Add this line

    //if data has restaurants, save them to storage
    if (data.length > 0) {
      chrome.storage.local.set({ restaurants: data });
    }
    data.forEach((restaurant) => {
      if (restaurant.openForDeliveryStatus !== "CLOSED" &&  restaurant.dynamicDeliveryFee <= alertThreshold) {
        createNotification(restaurant);
      }


    });
  } catch (error) {
    console.error('Error fetching data:', error); // Add this line
  }
}


chrome.storage.local.get(['coordinates', 'alertThreshold', 'alertEnabled'], (result) => {
  if (result.alertEnabled) {
    checkDeliveryFees(result.coordinates, result.alertThreshold);
  }
});

function poll() {
  chrome.storage.local.get(['coordinates', 'alertThreshold', 'alertEnabled'], (result) => {
    console.log('Polling:', result); // Add this line
    if (result.alertEnabled) {
      checkDeliveryFees(result.coordinates, result.alertThreshold);
    }
    setTimeout(poll,  60 * 1000); // Poll every 10 minutes
  });
}


// Start the polling
poll();
