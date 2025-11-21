const form = document.getElementById('perfilForm');
const resultadosDiv = document.getElementById('resultados');
const resultCount = document.getElementById('resultCount');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultadosDiv.classList.remove('empty');
  resultadosDiv.innerHTML = '<p>Cargando resultados...</p>';
  resultCount.textContent = 'Buscando...';

  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const res = await fetch('/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const json = await res.json();

    if (!res.ok) {
      resultadosDiv.innerHTML = '<p class="empty">Error: ' + (json.error || 'Desconocido') + '</p>';
      resultCount.textContent = 'Error';
      return;
    }

  if (!json.results || json.results.length === 0) { resultadosDiv.innerHTML = '<p class="empty">No se encontraron razas compatibles con ese perfil.</p>';
     resultCount.textContent = '0 resultados'; return; }
      resultCount.textContent = json.results.length + ' resultado(s)';
    resultadosDiv.innerHTML = '';
     json.results.forEach(r => { const div = document.createElement('div');
        div.className = 'card'; 
        const photoHtml = r.image && r.image.url ? '<img src="' + r.image.url + '" alt="' + r.name + '" />' : '<div class="no-photo">Sin foto 😢</div>';
        div.innerHTML = '<div class="card-main">' + '<div class="score-pill">Score: ' + r.score + '</div>' + '<h3>' + r.name + '</h3>' + '<p class="meta"><strong>Temperamento:</strong> ' + (r.temperament || 'N/D') + '</p>' + '<p class="meta"><strong>Peso:</strong> ' + ((r.weight && r.weight.metric) || 'N/D') + ' kg</p>' + '<p class="meta"><strong>Esperanza de vida:</strong> ' + (r.life_span || 'N/D') + '</p>' + '<p class="meta"><strong>Criado para:</strong> ' + (r.bred_for || 'N/D') + '</p>' + '</div>' + '<div class="card-photo">' + photoHtml + '</div>';
        resultadosDiv.appendChild(div); });
  } catch (err) {
    console.error(err);
    resultadosDiv.innerHTML = '<p class="empty">Error al conectar con el servidor.</p>';
    resultCount.textContent = 'Error de conexión';
  }
});