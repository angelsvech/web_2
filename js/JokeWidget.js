/**
 * JokeWidget.js
 * Виджет «Случайная шутка» — наследник UIComponent. API-виджет №2.
 *
 * Источник данных: JokeAPI v2 (https://jokeapi.dev/) — бесплатный, без API-ключа, с CORS.
 * Используется safe-mode для фильтрации неподходящего контента.
 *
 * Соответствие требованиям проверки качества 2026:
 * - Показывает состояния: загрузка, пустой результат, ошибка, успех.
 * - Устаревший запрос отменяется через AbortController.
 * - Данные API НЕ вставляются через innerHTML — только textContent/createElement.
 * - API без секретного ключа, запрос выполняется напрямую из браузера (CORS разрешён).
 * - destroy() отменяет незавершённые запросы (через базовый класс).
 */

import UIComponent from './UIComponent.js';

export default class JokeWidget extends UIComponent {
  constructor(config) {
    super({ ...config, icon: '😄' });

    this._jokeContentEl = null;
    this._refreshBtn = null;
  }

  renderBody() {
    const body = this._bodyEl;

    const content = document.createElement('div');
    content.className = 'joke-content';

    const category = document.createElement('span');
    category.className = 'joke-category';
    category.setAttribute('aria-label', 'Категория шутки');
    category.textContent = '—';

    const jokeText = document.createElement('div');
    jokeText.className = 'joke-text';
    jokeText.setAttribute('role', 'status');
    jokeText.setAttribute('aria-live', 'polite');
    jokeText.textContent = 'Нажмите «Обновить», чтобы получить шутку.';

    content.append(category, jokeText);
    body.appendChild(content);

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'btn btn-ghost';
    refreshBtn.textContent = '🔄 Обновить';
    body.appendChild(refreshBtn);

    this._jokeContentEl = jokeText;
    this._categoryEl = category;
    this._refreshBtn = refreshBtn;

    this._bindHandler(refreshBtn, 'click', () => this._fetchJoke());

    // Первичная загрузка
    this._fetchJoke();
  }

  /**
   * Показывает состояние загрузки.
   * @private
   */
  _showLoading() {
    this._categoryEl.textContent = '—';
    this._jokeContentEl.replaceChildren();

    const spinner = document.createElement('div');
    spinner.className = 'state-spinner';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', 'Загрузка шутки');

    this._jokeContentEl.appendChild(spinner);
  }

  /**
   * Показывает состояние ошибки.
   * @private
   */
  _showError(message) {
    this._categoryEl.textContent = 'Ошибка';
    this._jokeContentEl.replaceChildren();

    const icon = document.createElement('span');
    icon.className = 'state-error-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⚠️';

    const msg = document.createElement('p');
    msg.className = 'state-message';
    msg.textContent = message;

    this._jokeContentEl.append(icon, msg);
  }

  /**
   * Показывает пустой результат.
   * @private
   */
  _showEmpty() {
    this._categoryEl.textContent = '—';
    this._jokeContentEl.replaceChildren();

    const msg = document.createElement('p');
    msg.className = 'state-message';
    msg.textContent = 'Шутки не найдены. Попробуйте обновить.';

    this._jokeContentEl.appendChild(msg);
  }

  /**
   * Показывает успешный результат.
   * Данные API вставляются через textContent — безопасно.
   * @private
   */
  _showSuccess(joke) {
    if (!joke || (!joke.joke && !joke.setup)) {
      this._showEmpty();
      return;
    }

    this._categoryEl.textContent = joke.category || 'Разное';
    this._jokeContentEl.replaceChildren();

    if (joke.type === 'twopart' && joke.setup && joke.delivery) {
      const setup = document.createElement('p');
      setup.className = 'joke-setup';
      setup.textContent = joke.setup;

      const delivery = document.createElement('p');
      delivery.className = 'joke-delivery';
      delivery.textContent = joke.delivery;

      this._jokeContentEl.append(setup, delivery);
    } else {
      const text = document.createElement('p');
      text.textContent = joke.joke || '—';
      this._jokeContentEl.appendChild(text);
    }
  }

  /**
   * Запрашивает случайную шутку через JokeAPI.
   * Устаревший запрос отменяется через AbortController.
   * @private
   */
  async _fetchJoke() {
    // Отменяем предыдущий незавершённый запрос
    this._abortAll();
    const controller = this._createAbortController();

    const url = 'https://v2.jokeapi.dev/joke/Any?safe-mode';

    this._showLoading();

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Валидация: данные API считаются недоверенными
      if (!data || typeof data !== 'object' || data.error === true) {
        this._showError(data?.message || 'Сервис вернул ошибку');
        return;
      }

      if (!data.joke && !data.setup) {
        this._showEmpty();
        return;
      }

      this._showSuccess(data);
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // запрос отменён (устарел)
      }
      this._showError(`Не удалось загрузить шутку: ${err.message}`);
    }
  }
}
