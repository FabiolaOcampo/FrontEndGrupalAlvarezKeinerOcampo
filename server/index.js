import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const DOG_API_KEY = process.env.DOG_API_KEY;

app.use(cors());
app.use(express.json());

// ---------- Helpers ----------

function parseTemperament(temperament) {
    if (!temperament) return [];
    return temperament.split(',')
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

function scoreBreedForUser(breed, userProfile) {
    const temps = parseTemperament(breed.temperament);
    const weight = getWeightKg(breed);
    const energy = energyFromTemperamentAndBredFor(temps, breed.bred_for);
    const affectionate = isAffectionate(temps);
    const difficult = isDifficultForBeginners(temps);
    const barkiness = barkinessFromTemperament(temps);

    let score = 0;
app.use(express.static(path.join(__dirname, '..', 'public')));
   

// Tiempo libre
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

    // Actividad
    if (userProfile.actividad === 'sedentario' && energy === 'alta') score -= 2;
    if (userProfile.actividad === 'alto' && energy === 'alta') score += 2;

    // Vivienda
    if (userProfile.vivienda === 'departamento_chico') {
        if (suitableForSmallApartment(breed)) score += 3;
        else score -= 2;
    } else if (userProfile.vivienda === 'departamento_grande') {
        score += 1;
    } else if (userProfile.vivienda === 'casa_con_patio') {
        if (weight !== null && weight > 20) score += 2;
        if (energy === 'alta') score += 1;
    }

    // Experiencia
    if (userProfile.experiencia === 'principiante') {
        if (difficult) score -= 3;
        else score += 1;
    } else if (userProfile.experiencia === 'avanzado') {
        if (difficult) score += 1;
    }

    // Cariño
    if (userProfile.carino === 'alto' && affectionate) score += 3;
    if (userProfile.carino === 'bajo' && affectionate) score -= 1;

    // Ruido
    if (userProfile.ruido === 'baja' && barkiness === 'alto') score -= 3;
    if (userProfile.ruido === 'media' && barkiness === 'alto') score -= 1;

    return score;
}


// ---------- API: POST /match ----------

app.post('/match', async (req, res) => {
  const { tiempoLibre, actividad, ruido, vivienda, experiencia, carino } = req.body || {};

  if (!tiempoLibre || !actividad || !ruido || !vivienda || !experiencia || !carino) {
    return res.status(400).json({ error: 'Faltan campos en el perfil del usuario' });
  }

  try {
    const response = await fetch('https://api.thedogapi.com/v1/breeds', {
      headers: DOG_API_KEY ? { 'x-api-key': DOG_API_KEY } : {}
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Error al obtener razas de TheDogAPI' });
    }

    const breeds = await response.json();
    const scored = breeds.map(b => ({ breed: b, score: scoreBreedForUser(b, { tiempoLibre, actividad, ruido, vivienda, experiencia, carino }) }));

    const filtered = scored
      .filter(b => b.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({
      results: filtered.map(item => ({
        id: item.breed.id,
        name: item.breed.name,
        temperament: item.breed.temperament,
        score: item.score,
        weight: item.breed.weight,
        life_span: item.breed.life_span,
        bred_for: item.breed.bred_for,
        image: item.breed.image
      }))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la solicitud', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});