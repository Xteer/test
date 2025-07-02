// Element-Sicherheitszugriff
function safeGetElement(id) {
    var el = document.getElementById(id);
    if (!el) {
        console.warn("Element nicht gefunden:", id);
    }
    return el;
}

// Wettericon-Klassen
function getWeatherIconClass(code) {
    if (code === 0 || code === 1) return 'weather-icon sun-icon fas fa-sun';
    if (code === 2) return 'weather-icon cloud-icon fas fa-cloud-sun';
    if (code >= 3 && code <= 48) return 'weather-icon cloud-icon fas fa-cloud';
    if (code >= 51 && code <= 65) return 'weather-icon rain-icon fas fa-cloud-showers-heavy';
    if (code >= 71 && code <= 75) return 'weather-icon snow-icon fas fa-snowflake';
    if (code >= 80 && code <= 82) return 'weather-icon rain-icon fas fa-cloud-rain';
    if (code >= 85 && code <= 86) return 'weather-icon snow-icon fas fa-snowflake';
    if (code >= 95 && code <= 99) return 'weather-icon storm-icon fas fa-bolt';
    return 'weather-icon cloud-icon fas fa-cloud';
}

// Wetterbeschreibung
function getWeatherDescription(code) {
    var codes = {
        0: "Klarer Himmel", 1: "Hauptsächlich klar", 2: "Teils bewölkt",
        3: "Bewölkt", 45: "Nebel", 48: "Reifnebel", 51: "Leichter Regen",
        53: "Mäßiger Regen", 55: "Starker Regen", 61: "Leichter Regen",
        63: "Mäßiger Regen", 65: "Starker Regen", 71: "Leichter Schneefall",
        73: "Mäßiger Schneefall", 75: "Starker Schneefall", 80: "Leichte Regenschauer",
        81: "Mäßige Regenschauer", 82: "Starke Regenschauer", 85: "Leichte Schneeschauer",
        86: "Mäßige Schneeschauer", 95: "Gewitter", 96: "Gewitter mit Hagel",
        99: "Starkes Gewitter"
    };
    return codes[code] || "Unbekannt";
}

// Lade-Animation
function showLoading(show) {
    var spinner = document.querySelector('.loading');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'loading';
        safeGetElement('currentWeather').parentNode.appendChild(spinner);
    }
    spinner.style.display = show ? 'block' : 'none';
}

// Speichere letzten Suchort
function saveLastLocation(locationData) {
    try {
        localStorage.setItem('weatherApp_lastLocation', JSON.stringify(locationData));
    } catch (e) {
        console.warn("localStorage nicht verfügbar");
    }
}

// Suche nach Ort
function searchLocation() {
    var query = document.getElementById('locationInput').value;
    if (!query) return;

    showLoading(true);

    fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(query) + '&count=1')
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            if (data.results && data.results.length > 0) {
                var result = data.results[0];
                var input = safeGetElement('locationInput');
                if (input) input.value = result.name + ", " + (result.country || "");
                saveLastLocation(result);
                getWeatherData(result.latitude, result.longitude, result.name, result.country);
            } else {
                alert("Ort nicht gefunden");
            }
        })
        .catch(function(error) {
            console.error("Fehler bei der Geocodierung:", error);
            alert("Fehler bei der Ortsuche");
        })
        .finally(function() {
            showLoading(false);
        });
}

// Laden des letzten Ortes
function loadLastLocation() {
    try {
        var savedLocation = localStorage.getItem('weatherApp_lastLocation');
        if (savedLocation) {
            var data = JSON.parse(savedLocation);
            getWeatherData(data.latitude, data.longitude, data.name, data.country);
        }
    } catch (e) {
        console.error("Fehler beim Laden des letzten Ortes:", e);
    }
}

// Abrufen der Wetterdaten
function getWeatherData(lat, lon, name, country) {
    showLoading(true);

    fetch(' https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current_weather=true&hourly=temperature_2m,precipitation_probability,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_mean&timezone=auto')
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            updateCurrentWeather(data, name, country);
            updateHourlyForecast(data);
            updateDailyForecast(data);
        })
        .catch(function(error) {
            console.error("Fehler beim Abrufen der Wetterdaten:", error);
            alert("Fehler beim Abrufen der Wetterdaten");
        })
        .finally(function() {
            showLoading(false);
        });
}

// Aktualisiere aktuelles Wetter
function updateCurrentWeather(data, name, country) {
    var current = data.current_weather;

    var locationElem = safeGetElement('locationName');
    var tempElem = safeGetElement('tempValue');
    var weatherElem = safeGetElement('weatherDescription');
    var precipElem = safeGetElement('precipitation');

    if (locationElem) locationElem.textContent = country ? name + ", " + country : name;
    if (tempElem) tempElem.textContent = current.temperature;
    if (weatherElem) {
        weatherElem.className = getWeatherIconClass(current.weathercode);
        weatherElem.textContent = getWeatherDescription(current.weathercode);
    }
    if (precipElem) precipElem.textContent = current.precipitation_probability || "N/A";

    var timezoneOffset = data.utc_offset_seconds || 0;
    var utcTime = new Date(current.time);
    var localTime = new Date(utcTime.getTime() + timezoneOffset * 1000);
    var dateElem = safeGetElement('dateTime');
    if (dateElem) dateElem.textContent = localTime.toLocaleString();
}

// Aktualisiere stündliche Prognose
function updateHourlyForecast(data) {
    var forecastDiv = safeGetElement('hourlyForecast');
    if (!forecastDiv) return;
    forecastDiv.innerHTML = '';

    var hourly = data.hourly;
    var count = Math.min(6, hourly.time.length);

    for (var i = 0; i < count; i++) {
        var time = new Date(hourly.time[i]);
        var localTime = new Date(time.getTime() + (data.utc_offset_seconds || 0) * 1000);
        var hour = localTime.getHours().toString().padStart(2, '0');

        var card = document.createElement('div');
        card.className = 'forecast-item';
        card.innerHTML = `
            <p>${hour}:00</p>
            <p>${hourly.temperature_2m[i]}°C</p>
            <p class="${getWeatherIconClass(hourly.weathercode[i])}">${getWeatherDescription(hourly.weathercode[i])}</p>
        `;
        forecastDiv.appendChild(card);
    }
}

// Aktualisiere tägliche Prognose
function updateDailyForecast(data) {
    var forecastDiv = safeGetElement('dailyForecast');
    if (!forecastDiv) return;
    forecastDiv.innerHTML = '';

    var daily = data.daily;
    var count = Math.min(3, daily.time.length);

    for (var i = 0; i < count; i++) {
        var card = document.createElement('div');
        card.className = 'forecast-item';
        card.innerHTML = `
            <p>${new Date(daily.time[i]).toLocaleDateString()}</p>
            <p>↑ ${daily.temperature_2m_max[i]}°C</p>
            <p>↓ ${daily.temperature_2m_min[i]}°C</p>
            <p><i class="fas fa-cloud-rain"></i> ${daily.precipitation_probability_mean[i]}%</p>
        `;
        forecastDiv.appendChild(card);
    }
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        localStorage.setItem('test', 'ok');
        localStorage.removeItem('test');
        window.saveLastLocation = function(locationData) {
            localStorage.setItem('weatherApp_lastLocation', JSON.stringify(locationData));
        };
        loadLastLocation();
    } catch (e) {
        console.warn("localStorage nicht verfügbar");
    }
});
