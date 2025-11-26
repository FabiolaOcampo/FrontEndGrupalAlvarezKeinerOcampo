// =============================
//  ELEMENTOS DEL DOM
// =============================
const form = document.getElementById('perfilForm');
const resultadosDiv = document.getElementById('resultados');
const resultCount = document.getElementById('resultCount');

// =============================
//  FUNCIONES DE UTILIDAD
// =============================
function parseTemperament(temperament) {
    if (!temperament) return [];
    return temperament
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);
}

function getWeightKg(breed) {
    const metric = breed.weight?.metric || '';
    const parts = metric.split('-').map(p => parseFloat(p));
    const nums = parts.filter(n => !isNaN(n));
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function energyFromTemperamentAndBredFor(temperaments, bredFor) {
    const highEnergyWords = [
        'energetic', 'active', 'agile', 'alert',
        'high-spirited', 'playful', 'spirited', 'athletic'
    ];
    const lowEnergyWords = ['calm', 'laid-back', 'relaxed'];

    let score = 0;

    for (const t of temperaments) {
        if (highEnergyWords.includes(t)) score += 2;
        if (lowEnergyWords.includes(t)) score -= 1;
    }

    if (bredFor) {
        const bf = bredFor.toLowerCase();
        if (bf.includes('hunting') || bf.includes('herding') || bf.includes('working')) score += 2;
    }

    if (score <= 0) return 'baja';
    if (score <= 2) return 'media';
    return 'alta';
}

function isAffectionate(temperaments) {
    const loveWords = [
        'affectionate', 'loving', 'friendly', 'gentle',
        'companion', 'loyal', 'sweet'
    ];
    return temperaments.some(t => loveWords.includes(t));
}

function isDifficultForBeginners(temperaments) {
    const hardWords = [
        'independent', 'stubborn', 'dominant', 'aggressive',
        'strong willed', 'headstrong'
    ];
    return temperaments.some(t => hardWords.includes(t));
}

function barkinessFromTemperament(temperaments) {
    const barkyWords = ['alert', 'watchful', 'vocal'];
    let score = 0;

    for (const t of temperaments) {
        if (barkyWords.includes(t)) score++;
    }

    if (score === 0) return 'bajo';
    if (score === 1) return 'medio';
    return 'alto';
}

function suitableForSmallApartment(breed) {
    const weight = getWeightKg(breed);
    const temps = parseTemperament(breed.temperament);
    const energy = energyFromTemperamentAndBredFor(temps, breed.bred_for);

    if (weight !== null && weight > 20) return false;
    if (energy === 'alta') return false;

    return true;
}

// =============================
//  OBTENER FOTO SEGURA
// =============================
async function getBreedImage(breed) {
    if (breed.image?.url) return breed.image.url;

    try {
        const res = await fetch(`https://api.thedogapi.com/v1/images/search?breed_id=${breed.id}`);
        const data = await res.json();
        return data[0]?.url || "";
    } catch {
        return "";
    }
}

// =============================
//  PUNTUACIÓN PRINCIPAL
// =============================
function scoreBreedForUser(breed, userProfile) {
    const temps = parseTemperament(breed.temperament);
    const weight = getWeightKg(breed);
    const energy = energyFromTemperamentAndBredFor(temps, breed.bred_for);
    const affectionate = isAffectionate(temps);
    const difficult = isDifficultForBeginners(temps);
    const barkiness = barkinessFromTemperament(temps);

    let score = 0;

    if (userProfile.tiempoLibre === 'poco') {
        if (energy === 'baja') score += 3;
        if (energy === 'media') score += 1;
        if (energy === 'alta') score -= 3;
    } else if (userProfile.tiempoLibre === 'medio') {
        if (energy === 'media') score += 3;
        if (energy === 'baja') score += 1;
    } else if (userProfile.tiempoLibre === 'mucho') {
        if (energy === 'alta') score += 3;
    }

    if (userProfile.actividad === 'sedentario' && energy === 'alta') score -= 2;
    if (userProfile.actividad === 'alto' && energy === 'alta') score += 2;

    if (userProfile.vivienda === 'departamento_chico') {
        if (suitableForSmallApartment(breed)) score += 3;
        else score -= 2;
    } else if (userProfile.vivienda === 'departamento_grande') {
        score += 1;
    } else if (userProfile.vivienda === 'casa_con_patio') {
        if (weight !== null && weight > 20) score += 2;
        if (energy === 'alta') score += 1;
    }

    if (userProfile.experiencia === 'principiante') {
        if (difficult) score -= 3;
        else score += 1;
    } else if (userProfile.experiencia === 'avanzado') {
        if (difficult) score += 1;
    }

    if (userProfile.carino === 'alto' && affectionate) score += 3;
    if (userProfile.carino === 'bajo' && affectionate) score -= 1;

    if (userProfile.ruido === 'baja' && barkiness === 'alto') score -= 3;
    if (userProfile.ruido === 'media' && barkiness === 'alto') score -= 1;

    return score;
}

// =============================
//  EVENTO PRINCIPAL
// =============================
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    resultadosDiv.innerHTML = '<p>Cargando resultados...</p>';
    resultCount.textContent = 'Buscando...';

    const preferencias = Object.fromEntries(new FormData(form).entries());

    try {
        const res = await fetch("https://api.thedogapi.com/v1/breeds");
        const breeds = await res.json();

        // puntuar
        const scored = breeds.map(b => ({
            breed: b,
            score: scoreBreedForUser(b, preferencias),
        }));

        // top 10
        const best = scored
            .filter(b => b.score >= 2)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        resultCount.textContent = best.length + " resultados";
        resultadosDiv.innerHTML = "";

        for (const item of best) {
            const breed = item.breed;
            const img = await getBreedImage(breed);

            const div = document.createElement("div");
            div.className = "card";

            div.innerHTML = `
                <div class="card-main">
                    <div class="score-pill">Score: ${item.score}</div>
                    <h3 style="text-transform:none">${breed.name}</h3>
                    <p style="text-transform:none">${breed.temperament || "Sin datos"}</p>
                </div>
                <div class="card-photo">
                    <img src="${img}" alt="${breed.name}">
                </div>
            `;

            resultadosDiv.appendChild(div);
        }

    } catch (err) {
        console.error(err);
        resultadosDiv.innerHTML = '<p class="empty">Error al conectar con la API.</p>';
        resultCount.textContent = 'Error';
    }
});