const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const statusElement = document.getElementById('status');
const usersList = document.getElementById('users-list');
const shareBtn = document.getElementById('shareBtn');
const simulateBtn = document.getElementById('simulateBtn');
const clearBtn = document.getElementById('clearBtn');

const markers = {};
const users = {};

const socket = io();

document.addEventListener('DOMContentLoaded', function() {
  if (!shareBtn || !simulateBtn || !clearBtn) {
    console.error('Required DOM elements not found');
  }
});

function updateStatus(message, isConnected) {
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = isConnected ? 'connected' : 'disconnected';
  }
}

function updateUserList() {
  if (!usersList) return;
  
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

function updateMarker(id, lat, lon, timestamp) {
  if (!id || lat == null || lon == null || timestamp == null) return;
  
  const popupContent = `
    <div class="marker-popup">
      <strong>User:</strong> ${id.substring(0, 8)}...<br>
      <strong>Time:</strong> ${new Date(timestamp).toLocaleTimeString()}<br>
      <strong>Coordinates:</strong><br>
      ${parseFloat(lat).toFixed(6)}, ${parseFloat(lon).toFixed(6)}
    </div>
  `;
  
  if (markers[id]) {
    markers[id].setLatLng([lat, lon]);
    markers[id].getPopup().setContent(popupContent);
  } else {
    markers[id] = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(popupContent)
      .openPopup();
  }
  
  map.flyTo([lat, lon], 10, {
    animate: true,
    duration: 1.5
  });
}

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

function clearMarkers() {
  Object.keys(markers).forEach(id => {
    if (markers[id]) {
      map.removeLayer(markers[id]);
    }
  });
  
  Object.keys(markers).forEach(key => delete markers[key]);
  Object.keys(users).forEach(key => delete users[key]);
  
  updateUserList();
}

socket.on('connect', () => {
  updateStatus(`Connected as ${socket.id}`, true);
});

socket.on('disconnect', () => {
  updateStatus('Disconnected from server', false);
});

socket.on('receive-location', (data) => {
  if (!data || !data.id || data.lat == null || data.lon == null) return;
  
  const { id, lat, lon, ts } = data;
  
  users[id] = {
    id: id,
    lastSeen: ts
  };
  
  updateMarker(id, lat, lon, ts);
  updateUserList();
});

socket.on('user-disconnected', (id) => {
  if (id) {
    removeMarker(id);
  }
});

socket.on('user-connected', (data) => {
  if (!data || !data.id) return;
  
  const { id } = data;
  users[id] = {
    id: id,
    lastSeen: Date.now()
  };
  updateUserList();
});

socket.on('existing-users', (existingUsers) => {
  if (!Array.isArray(existingUsers)) return;
  
  existingUsers.forEach(user => {
    if (user && user.id && user.lat != null && user.lon != null) {
      users[user.id] = {
        id: user.id,
        lastSeen: user.ts
      };
      updateMarker(user.id, user.lat, user.lon, user.ts);
    }
  });
  updateUserList();
});

socket.on('clear-markers', () => {
  clearMarkers();
});


shareBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }


  shareBtn.textContent = 'Getting Location...';
  shareBtn.disabled = true;
  
  navigator.geolocation.getCurrentPosition(
    (position) => {

      shareBtn.textContent = 'Share My Location';
      shareBtn.disabled = false;
      
      if (!position || !position.coords) {
        alert('Unable to get your location.');
        return;
      }
      
      const data = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        ts: Date.now()
      };
      
      socket.emit('send-location', data);
    },
    (error) => {
 
      shareBtn.textContent = 'Share My Location';
      shareBtn.disabled = false;
      
      let errorMessage = "Unable to get your location.";
      
      if (error) {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location services.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
      }
      
      alert(errorMessage);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    }
  );
});

simulateBtn.addEventListener('click', () => {
  const data = {
    lat: (Math.random() * 180 - 90),
    lon: (Math.random() * 360 - 180),
    ts: Date.now()
  };
  
  socket.emit('send-location', data);
});

clearBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all markers from the map?')) {
    clearMarkers();
    socket.emit('clear-markers');
  }
});