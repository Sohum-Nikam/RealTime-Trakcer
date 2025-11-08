// Initialize the map
const map = L.map('map').setView([20, 0], 2);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// DOM elements
const statusElement = document.getElementById('status');
const usersList = document.getElementById('users-list');
const shareBtn = document.getElementById('shareBtn');
const simulateBtn = document.getElementById('simulateBtn');
const clearBtn = document.getElementById('clearBtn');

// Store markers and user data
const markers = {};
const users = {};

// Connect to server
const socket = io();

// Update connection status
function updateStatus(message, isConnected) {
  statusElement.textContent = message;
  statusElement.className = isConnected ? 'connected' : 'disconnected';
}

// Add or update user in the list
function updateUserList() {
  usersList.innerHTML = '';
  Object.values(users).forEach(user => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>User ${user.id.substring(0, 8)}...</span>
      <span>${new Date(user.lastSeen).toLocaleTimeString()}</span>
    `;
    usersList.appendChild(li);
  });
}

// Add or update a marker on the map
function updateMarker(id, lat, lon, timestamp) {
  // Create popup content
  const popupContent = `
    <div class="marker-popup">
      <strong>User:</strong> ${id.substring(0, 8)}...<br>
      <strong>Time:</strong> ${new Date(timestamp).toLocaleTimeString()}<br>
      <strong>Coordinates:</strong><br>
      ${lat.toFixed(6)}, ${lon.toFixed(6)}
    </div>
  `;
  
  // If marker exists, update its position
  if (markers[id]) {
    markers[id].setLatLng([lat, lon]);
    markers[id].getPopup().setContent(popupContent);
  } else {
    // Create new marker
    markers[id] = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(popupContent)
      .openPopup();
  }
  
  // Fly to the new location
  map.flyTo([lat, lon], 10, {
    animate: true,
    duration: 1.5
  });
}

// Remove a marker from the map
function removeMarker(id) {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
  
  if (users[id]) {
    delete users[id];
  }
  
  updateUserList();
}

// Clear all markers
function clearMarkers() {
  Object.keys(markers).forEach(id => {
    map.removeLayer(markers[id]);
  });
  
  Object.keys(markers).forEach(key => delete markers[key]);
  Object.keys(users).forEach(key => delete users[key]);
  
  updateUserList();
}

// Handle connection events
socket.on('connect', () => {
  updateStatus(`Connected as ${socket.id}`, true);
});

socket.on('disconnect', () => {
  updateStatus('Disconnected from server', false);
});

// Handle location updates
socket.on('receive-location', (data) => {
  const { id, lat, lon, ts } = data;
  
  // Update user data
  users[id] = {
    id: id,
    lastSeen: ts
  };
  
  // Update marker
  updateMarker(id, lat, lon, ts);
  
  // Update user list
  updateUserList();
});

// Handle user disconnections
socket.on('user-disconnected', (id) => {
  removeMarker(id);
});

// Share current location
shareBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const data = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        ts: Date.now()
      };
      
      socket.emit('send-location', data);
    },
    (error) => {
      switch(error.code) {
        case error.PERMISSION_DENIED:
          alert("User denied the request for Geolocation.");
          break;
        case error.POSITION_UNAVAILABLE:
          alert("Location information is unavailable.");
          break;
        case error.TIMEOUT:
          alert("The request to get user location timed out.");
          break;
        default:
          alert("An unknown error occurred.");
          break;
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
});

// Simulate location
simulateBtn.addEventListener('click', () => {
  const data = {
    lat: (Math.random() * 180 - 90), // Random latitude between -90 and 90
    lon: (Math.random() * 360 - 180), // Random longitude between -180 and 180
    ts: Date.now()
  };
  
  socket.emit('send-location', data);
});

// Clear all markers
clearBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all markers from the map?')) {
    clearMarkers();
    socket.emit('clear-markers');
  }
});