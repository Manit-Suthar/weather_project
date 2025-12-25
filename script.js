// --- DOM Elements ---
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const themeToggle = document.getElementById("theme-toggle");
const weatherContent = document.getElementById("weather-content");
const errorMessage = document.getElementById("error-message");
const loadingSpinner = document.getElementById("loading");
const suggestionsList = document.getElementById("suggestions-list");
const weatherEffectsContainer = document.getElementById("weather-effects");
const backgroundGradient = document.querySelector(".background-gradient");

// Display Elements
const cityNameEl = document.getElementById("city-name");
const dateTimeEl = document.getElementById("date-time");
const tempEl = document.getElementById("temperature");
const iconEl = document.getElementById("weather-icon");
const conditionEl = document.getElementById("condition-text");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind-speed");
const cloudEl = document.getElementById("cloud-cover");
const visibilityEl = document.getElementById("visibility");
const lifestyleTipEl = document.getElementById("lifestyle-tip");

// --- API Config ---
const API_KEY = "ff2c8ba441ac45e189694017241910";
const BASE_URL = "https://api.weatherapi.com/v1/current.json";
const SEARCH_URL = "https://api.weatherapi.com/v1/search.json";

// --- State ---
let debounceTimer; 
let currentFocus = -1;

// --- Event Listeners ---
searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (city) { fetchWeather(city); closeSuggestions(); }
});

cityInput.addEventListener("input", () => {
    const query = cityInput.value.trim();
    currentFocus = -1; 
    clearTimeout(debounceTimer);
    if (query.length < 3) { closeSuggestions(); return; }
    debounceTimer = setTimeout(() => { fetchSuggestions(query); }, 300);
});

cityInput.addEventListener("keydown", (e) => {
    const items = suggestionsList.querySelectorAll(".suggestion-item");
    if (e.key === "ArrowDown") {
        currentFocus++; 
        if (currentFocus >= items.length) currentFocus = 0; 
        addActive(items);
    } else if (e.key === "ArrowUp") {
        currentFocus--; 
        if (currentFocus < 0) currentFocus = items.length - 1; 
        addActive(items);
    } else if (e.key === "Enter") {
        e.preventDefault(); 
        if (currentFocus > -1 && items[currentFocus]) { items[currentFocus].click(); }
        else { const city = cityInput.value.trim(); if(city){ fetchWeather(city); closeSuggestions(); } }
    }
});

document.addEventListener("click", (e) => {
    if (!suggestionsList.contains(e.target) && e.target !== cityInput) closeSuggestions();
});

locationBtn.addEventListener("click", () => {
    if (navigator.geolocation) {
        toggleLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => { fetchWeather(`${pos.coords.latitude},${pos.coords.longitude}`); },
            (err) => { showError("Location access denied."); toggleLoading(false); }
        );
    } else { showError("Geolocation not supported."); }
});

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const icon = themeToggle.querySelector("i");
    if (document.body.classList.contains("dark-mode")) {
        icon.classList.replace("fa-moon", "fa-sun");
    } else {
        icon.classList.replace("fa-sun", "fa-moon");
    }
});

// --- Core Logic ---

async function fetchWeather(query) {
    toggleLoading(true); showError(null); weatherContent.classList.add("hidden");
    try {
        const response = await fetch(`${BASE_URL}?key=${API_KEY}&q=${query}&aqi=no`);
        if (!response.ok) throw new Error("City not found");
        const data = await response.json();
        updateUI(data);
    } catch (error) { showError(error.message); } 
    finally { toggleLoading(false); }
}

async function fetchSuggestions(query) {
    try {
        const response = await fetch(`${SEARCH_URL}?key=${API_KEY}&q=${query}`);
        const cities = await response.json();
        renderSuggestions(cities);
    } catch (error) { console.error(error); }
}

function renderSuggestions(cities) {
    suggestionsList.innerHTML = "";
    if(cities.length > 0) suggestionsList.classList.remove("hidden");
    cities.forEach(city => {
        const li = document.createElement("li");
        li.classList.add("suggestion-item");
        li.innerText = `${city.name}, ${city.country}`;
        li.addEventListener("click", () => {
            cityInput.value = city.name;
            closeSuggestions();
            fetchWeather(city.name);
        });
        suggestionsList.appendChild(li);
    });
}

function updateUI(data) {
    const { name, country, localtime } = data.location;
    const { temp_c, condition, humidity, wind_kph, cloud, vis_km, is_day } = data.current;

    // 1. Text Data
    cityNameEl.innerText = `${name}, ${country}`;
    dateTimeEl.innerText = formatDate(localtime);
    tempEl.innerText = `${temp_c}°C`;
    conditionEl.innerText = condition.text;
    humidityEl.innerText = `${humidity}%`;
    windEl.innerText = `${wind_kph} km/h`;
    cloudEl.innerText = `${cloud}%`;
    visibilityEl.innerText = `${vis_km} km`;
    iconEl.src = `https:${condition.icon}`;

    // 2. Determine Time Phase (Morning/Afternoon/Evening/Night)
    // We use the 'localtime' string from the API to get the correct hour for THAT city
    const timeOfDay = getTimeOfDay(localtime);

    // 3. Generate Smart Witty Quote
    lifestyleTipEl.innerText = getWittyQuote(condition.text, temp_c, timeOfDay, is_day);

    // 4. Set Visual Theme (Gradients) - Now respects Night vs Day
    setWeatherTheme(condition.text, is_day);

    // 5. Create Moving Animations
    createVisuals(condition.text, is_day);

    weatherContent.classList.remove("hidden");
}

/**
 * Extracts hour from API "2025-10-14 20:00" format
 */
function getTimeOfDay(localtime) {
    const date = new Date(localtime);
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 21) return "Evening";
    return "Night";
}

/**
 * Generates specific animations (Rain, Snow, Clouds, Stars, Sun)
 */
function createVisuals(conditionText, isDay) {
    // Clear previous effects
    weatherEffectsContainer.innerHTML = "";
    
    const text = conditionText.toLowerCase();

    // 1. Rain
    if (text.includes("rain") || text.includes("drizzle") || text.includes("shower")) {
        createParticles("raindrop", 100);
    }
    // 2. Snow (Now Visible!)
    else if (text.includes("snow") || text.includes("ice") || text.includes("blizzard")) {
        createParticles("snowflake", 50);
    }
    // 3. Clear Night -> Stars
    else if (isDay === 0 && (text.includes("clear") || text.includes("fair"))) {
        createParticles("star", 60);
    }
    // 4. Cloudy -> Floating Clouds
    else if (text.includes("cloud") || text.includes("overcast") || text.includes("mist")) {
        createParticles("cloud-shape", 15); // Increased count slightly
    }
    // 5. Sunny/Clear Day -> Sun Glow (NEW)
    else if (isDay === 1 && (text.includes("sunny") || text.includes("clear"))) {
        const sun = document.createElement("div");
        sun.classList.add("sun-glow");
        weatherEffectsContainer.appendChild(sun);
    }
}
function createParticles(className, count) {
    for (let i = 0; i < count; i++) {
        const el = document.createElement("div");
        el.classList.add(className);
        
        // Random horizontal position
        el.style.left = Math.random() * 100 + "vw";
        
        // Randomize rain/snow fall speed
        if (className === "raindrop") {
            // Rain falls fast (0.5 s to 1s)
            el.style.animationDuration = (Math.random() * 0.5 + 0.5) + "s";
            el.style.opacity = Math.random();
            el.style.animationDelay = Math.random() * 5 + "s"; // Start at different times

        } 
        else if (className === "snowflake") {
            // SNOW FIX: Slower fall (3s to 8s)
            el.style.animationDuration = (Math.random() * 5 + 3) + "s"; 
            el.style.opacity = Math.random();
            el.style.animationDelay = Math.random() * 5 + "s"; // Start at different times
        }
        // Randomize Stars
        else if (className === "star") {
            el.style.top = Math.random() * 100 + "vh";
            el.style.width = Math.random() * 3 + "px";
            el.style.height = el.style.width;
            el.style.animationDelay = Math.random() * 2 + "s";
        }
        // Randomize Clouds
        else if (className === "cloud-shape") {
            el.style.top = Math.random() * 40 + "vh";
            const size = Math.random() * 100 + 100;
            el.style.width = size + "px";
            el.style.height = size + "px";
            el.style.animationDuration = (Math.random() * 20 + 20) + "s";
            el.style.left = -300 + "px"; // Start off-screen
        }

        weatherEffectsContainer.appendChild(el);
    }
}

/**
 * SMART LOGIC: Checks Time AND Weather
 */
function getWittyQuote(conditionText, temp, timeOfDay, isDay) {
    const text = conditionText.toLowerCase();
    
    // --- NIGHT LOGIC ---
    if (isDay === 0) {
        if (text.includes("clear")) return "Look at the stars! Perfect time for deep thinking.";
        if (text.includes("rain")) return "Rainy night? Perfect weather for deep sleep.";
        if (text.includes("snow")) return "It's freezing tonight! Grab an extra blanket.";
        if (temp < 10) return "Chilly night ahead. Stay warm!";
        return "Have a peaceful night. Rest well!";
    }

    // --- DAY LOGIC (Morning) ---
    if (timeOfDay === "Morning") {
        if (text.includes("rain")) return "Rainy morning coffee hits different. Enjoy!";
        if (text.includes("clear") || text.includes("sunny")) return "Glorious morning! Go for a run or walk the dog.";
        return "Good morning! Start your day with a smile.";
    }

    // --- DAY LOGIC (Afternoon/Evening) ---
    if (text.includes("rain")) return "Don't forget your umbrella! Maybe skip the walk.";
    if (text.includes("sun") || text.includes("clear")) {
        if (temp > 30) return "It's scorching! Stay hydrated and wear sunscreen.";
        return "Beautiful day outside. Why are you staring at a screen?";
    }
    if (text.includes("cloud")) return "Cloudy skies... looks like a dramatic movie scene.";
    if (text.includes("snow")) return "Do you want to build a snowman? Or just freeze?";
    
    return "Enjoy your day! Weather looks interesting.";
}

function setWeatherTheme(conditionText, isDay) {
    backgroundGradient.style.background = ""; // Reset
    const text = conditionText.toLowerCase();

    // 1. NIGHT OVERRIDE (Crucial Fix)
    // If API says it's night, use dark colors regardless of "Clear" status
    if (isDay === 0) {
        backgroundGradient.style.background = "linear-gradient(135deg, #0f2027, #203a43, #2c5364)";
        return;
    }

    // 2. DAY THEMES
    if (text.includes("sunny") || text.includes("clear")) {
        backgroundGradient.style.background = "linear-gradient(135deg, #2980b9, #f39c12)";
    } else if (text.includes("cloud") || text.includes("overcast") || text.includes("mist")) {
        backgroundGradient.style.background = "linear-gradient(135deg, #606c88, #3f4c6b)";
    } else if (text.includes("rain") || text.includes("drizzle")) {
        backgroundGradient.style.background = "linear-gradient(135deg, #203a43, #2c5364)";
    } else if (text.includes("snow")) {
        backgroundGradient.style.background = "linear-gradient(135deg, #83a4d4, #b6fbff)";
    } else {
        backgroundGradient.style.background = "linear-gradient(135deg, #00feba, #5b548a)"; // Default
    }
}

function addActive(items) {
    items.forEach(item => item.classList.remove("active"));
    if (items[currentFocus]) {
        items[currentFocus].classList.add("active");
        items[currentFocus].scrollIntoView({ block: "nearest" });
    }
}

function closeSuggestions() {
    suggestionsList.innerHTML = "";
    suggestionsList.classList.add("hidden");
    currentFocus = -1;
}

function toggleLoading(show) {
    if (show) loadingSpinner.classList.remove("hidden");
    else loadingSpinner.classList.add("hidden");
}

function showError(msg) {
    errorMessage.innerText = msg || "";
    if (msg) errorMessage.classList.remove("hidden");
    else errorMessage.classList.add("hidden");
}

function formatDate(timeString) {
    const date = new Date(timeString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
}

// Initial Load
fetchWeather("Ahmedabad");