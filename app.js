const form = document.getElementById('perfilForm');
const resultadosDiv = document.getElementById('resultados');
const resultCount = document.getElementById('resultCount');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  resultadosDiv.classList.remove('empty');
  resultadosDiv.innerHTML = '<p>Cargando resultados...</p>';
  resultCount.textContent = 'Buscando...';

  // Tomamos los datos del formulario
  const preferencias = Object.fromEntries(new FormData(form).entries());

  try {
    // 1. Traer lista de razas
    const resRazas = await fetch("https://dog.ceo/api/breeds/list/all");
    const dataRazas = await resRazas.json();

    const razas = Object.keys(dataRazas.message);

    // 2. Simular “match” calculando un score básico según preferencias
    const resultados = [];

    for (const raza of razas) {
      // 3. Traer 1 foto por raza
      const resFoto = await fetch(`https://dog.ceo/api/breed/${raza}/images/random`);
      const dataFoto = await resFoto.json();

      // Pequeño score inventado
      const score =
        (preferencias.tiempoLibre === "mucho" ? 10 : 5) +
        (preferencias.actividad === "alto" ? 10 : 5) +
        (preferencias.experiencia === "avanzado" ? 10 : 5);

      resultados.push({
        name: raza,
        score: score,
        image: dataFoto.message
      });
    }

    // Ordenamos mayor score → menor
    resultados.sort((a, b) => b.score - a.score);

    // Mostrar en pantalla
    resultCount.textContent = resultados.length + " resultados";
    resultadosDiv.innerHTML = "";

    resultados.forEach(r => {
      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <div class="card-main">
          <div class="score-pill">Score: ${r.score}</div>
          <h3>${r.name}</h3>
        </div>
        <div class="card-photo">
          <img src="${r.image}" alt="${r.name}">
        </div>
      `;

      resultadosDiv.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    resultadosDiv.innerHTML = '<p class="empty">Error al conectar con la API.</p>';
    resultCount.textContent = 'Error';
  }
});