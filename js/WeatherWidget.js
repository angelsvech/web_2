/**
 * WeatherWidget.js
 * Виджет «Погода» — наследник UIComponent. API-виджет №1.
 *
 * Источник данных: Open-Meteo (https://open-meteo.com/) — бесплатный, без API-ключа, с CORS.
 * Геокодинг не требуется: координаты городов зашиты в массив.
 *
 * Соответствие требованиям проверки качества 2026:
 * - Показывает состояния: загрузка, пустой результат, ошибка, успех.
 * - Устаревший запрос отменяется через AbortController.
 * - Данные API НЕ вставляются через innerHTML — только textContent/createElement.
 * - API без секретного ключа, запрос выполняется напрямую из браузера (CORS разрешён).
 * - destroy() отменяет незавершённые запросы (через базовый класс).
 */

import UIComponent from './UIComponent.js';

// Города с координатами (геокодинг не нужен)
const CITIES = [
  { name: 'Москва', latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow' },
  { name: 'Санкт-Петербург', latitude: 59.9343, longitude: 30.3351, timezone: 'Europe/Moscow' },
  { name: 'Рига', latitude: 56.9496, longitude: 24.1052, timezone: 'Europe/Riga' },
  { name: 'Лондон', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { name: 'Токио', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
];

// Коды погодных условий WMO → описание + эмодзи
// Источник: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
const WMO_CODES = {
  0: { desc: 'Ясно', icon: '☀️' },
  1: { desc: 'Преимущественно ясно', icon: '🌤️' },
  2: { desc: 'Переменная облачность', icon: '⛅' },
  3: { desc: 'Пасмурно', icon: '☁️' },
  45: { desc: 'Туман', icon: '🌫️' },
  48: { desc: 'Изморозь', icon: '🌫️' },
  51: { desc: 'Лёгкая морось', icon: '🌦️' },
  53: { desc: 'Морось', icon: '🌦️' },
  55: { desc: 'Сильная морось', icon: '🌧️' },
  56: { desc: 'Ледяная морось', icon: '🌧️' },
  57: { desc: 'Сильная ледяная морось', icon: '🌧️' },
  61: { desc: 'Небольшой дождь', icon: '🌧️' },
  63: { desc: 'Дождь', icon: '🌧️' },
  65: { desc: 'Сильный дождь', icon: '🌧️' },
  66: { desc: 'Ледяной дождь', icon: '🌧️' },
  67: { desc: 'Сильный ледяной дождь', icon: '🌧️' },
  71: { desc: 'Небольшой снег', icon: '🌨️' },
  73: { desc: 'Снег', icon: '🌨️' },
  75: { desc: 'Сильный снег', icon: '❄️' },
  77: { desc: 'Снежная крупка', icon: '❄️' },
  80: { desc: 'Лёгкие ливни', icon: '🌦️' },
  81: { desc: 'Ливни', icon: '🌧️' },
  82: { desc: 'Сильные ливни', icon: '⛈️' },
  85: { desc: 'Снег с дождём', icon: '🌨️' },
  86: { desc: 'Сильный снег с дождём', icon: '❄️' },
  95: { desc: 'Гроза', icon: '⛈️' },
  96: { desc: 'Гроза с градом', icon: '⛈️' },
  99: { desc: 'Сильная гроза с градом', icon: '⛈️' },
};

export default class WeatherWidget extends UIComponent {
  constructor(config) {
    super({ ...config, icon: '🌦️' });

    this._citySelectEl = null;
    this._displayEl = null;
    this._currentCity = CITIES[0];
  }

  renderBody() {
    const body = this._bodyEl;

    const select = document.createElement('select');
    select.className = 'weather-city-select';
    select.setAttribute('aria-label', 'Выбор города');

    for (const city of CITIES) {
      const option = document.createElement('option');
      option.value = city.name;
      option.textContent = city.name;
      select.appendChild(option);
    }

    body.appendChild(select);

    // Контейнер для отображения погоды / состояний
    const display = document.createElement('div');
    display.className = 'weather-display';
    body.appendChild(display);

    this._citySelectEl = select;
    this._displayEl = display;

    this._bindHandler(select, 'change', () => {
      const selected = CITIES.find((c) => c.name === select.value);
      if (selected) {
        this._currentCity = selected;
        this._fetchWeather();
      }
    });

    // Первичная загрузка
    this._fetchWeather();
  }

  /**
   * Показывает состояние загрузки.
   * @private
   */
  _showLoading() {
    this._displayEl.replaceChildren();

    const container = document.createElement('div');
    container.className = 'state-container';

    const spinner = document.createElement('div');
    spinner.className = 'state-spinner';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', 'Загрузка данных о погоде');

    const message = document.createElement('p');
    message.className = 'state-message';
    message.textContent = 'Загрузка погоды…';

    container.append(spinner, message);
    this._displayEl.appendChild(container);
  }

  /**
   * Показывает состояние ошибки.
   * @private
   */
  _showError(message) {
    this._displayEl.replaceChildren();

    const container = document.createElement('div');
    container.className = 'state-container state-error';

    const icon = document.createElement('span');
    icon.className = 'state-error-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⚠️';

    const msg = document.createElement('p');
    msg.className = 'state-message';
    msg.textContent = message;

    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn btn-ghost btn-sm';
    retryBtn.textContent = 'Повторить';
    this._bindHandler(retryBtn, 'click', () => this._fetchWeather());

    container.append(icon, msg, retryBtn);
    this._displayEl.appendChild(container);
  }

  /**
   * Показывает пустой результат (нет данных).
   * @private
   */
  _showEmpty() {
    this._displayEl.replaceChildren();

    const container = document.createElement('div');
    container.className = 'state-container state-empty';

    const msg = document.createElement('p');
    msg.className = 'state-message';
    msg.textContent = 'Данные о погоде недоступны для этого города.';

    container.appendChild(msg);
    this._displayEl.appendChild(container);
  }

  /**
   * Показывает успешный результат.
   * @private
   */
  _showSuccess(data) {
    this._displayEl.replaceChildren();

    if (!data || typeof data !== 'object' || !data.current) {
      this._showEmpty();
      return;
    }

    const current = data.current;

    const weatherInfo = WMO_CODES[current.weather_code] || { desc: 'Неизвестно', icon: '❓' };

    const temp = document.createElement('div');
    temp.className = 'weather-temp';
    temp.textContent = `${Math.round(current.temperature_2m)}°C`;

    const icon = document.createElement('span');
    icon.className = 'weather-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = weatherInfo.icon;

    const metaWrap = document.createElement('div');
    metaWrap.className = 'weather-meta';

    const desc = document.createElement('span');
    desc.className = 'weather-desc';
    desc.textContent = weatherInfo.desc;

    const wind = document.createElement('span');
    wind.textContent = `Ветер: ${current.wind_speed_10m} км/ч`;

    const humidity = document.createElement('span');
    humidity.textContent = `Влажность: ${current.relative_humidity_2m}%`;

    const code = document.createElement('span');
    code.className = 'weather-code';
    code.textContent = `Код WMO: ${current.weather_code}`;

    metaWrap.append(desc, wind, humidity, code);

    this._displayEl.append(temp, icon, metaWrap);
  }

  /**
   * Запрашивает данные о погоде через Open-Meteo API.
   * Устаревший запрос отменяется через AbortController.
   * @private
   */
  async _fetchWeather() {
    // Отменяем предыдущий незавершённый запрос
    this._abortAll();
    const controller = this._createAbortController();

    const city = this._currentCity;
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${city.latitude}` +
      `&longitude=${city.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
      `&timezone=${city.timezone}`;

    this._showLoading();

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Валидация: данные API считаются недоверенными
      if (!data || typeof data !== 'object' || !data.current) {
        this._showEmpty();
        return;
      }

      this._showSuccess(data);
    } catch (err) {
      // AbortError — запрос отменён (устарел), не показываем как ошибку
      if (err.name === 'AbortError') {
        return;
      }
      this._showError(`Не удалось загрузить погоду: ${err.message}`);
    }
  }
}
