/** Reuse the shell's notice and button treatment; no game/session is rendered. */
export function showSaveBlocked(app, reason) {
  const panel = document.createElement('section');
  panel.className = 'notice'; panel.dataset.saveBlocked = reason;
  panel.setAttribute('role', 'alert');
  const heading = document.createElement('h2'), copy = document.createElement('p');
  heading.textContent = reason === 'occupied' ? 'Игра открыта в другой вкладке' : 'Обновите страницу';
  copy.textContent = reason === 'occupied'
    ? 'Продолжите игру там или закройте ту вкладку и нажмите «Обновить». Здесь сохранение не меняется.'
    : reason === 'suspended'
      ? 'Эта вкладка была приостановлена. Обновите страницу, чтобы открыть последнее сохранение.'
      : 'Не удалось безопасно открыть сохранение. Обновите страницу в современном браузере. Игра не запущена, сохранение не изменено.';
  const reload = document.createElement('button');
  reload.type = 'button'; reload.className = 'button primary'; reload.textContent = 'Обновить';
  reload.addEventListener('click', () => location.reload());
  panel.append(heading, copy, reload); app.replaceChildren(panel);
}
