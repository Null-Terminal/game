const loading = document.getElementById("loading")!;
const message = document.getElementById("loading-message")!;

try {
  await import("#game/main");
  loading.hidden = true;

} catch (err) {
  loading.hidden = false;
  loading.classList.add("loading-error");
  message.textContent = "Не удалось загрузить игру";
  console.error(err);
}
