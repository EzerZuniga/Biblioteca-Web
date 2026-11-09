// Estado del proceso compartido entre el apagado y el healthcheck: mientras el
// servidor se apaga, /health responde 503 para que no le envíen tráfico nuevo.
let apagando = false;

module.exports = {
  marcarApagando: () => {
    apagando = true;
  },
  estaApagando: () => apagando,
};
