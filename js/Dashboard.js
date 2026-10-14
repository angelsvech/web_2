/**
 * Dashboard.js
 * Класс, управляющий всей панелью (коллекцией виджетов).
 *
 * Ответственность:
 * - Хранить массив активных виджетов.
 * - Добавлять виджеты указанного типа (addWidget).
 * - Удалять виджеты по ID (removeWidget).
 * - Отрисовывать общую сетку виджетов.
 * - Обрабатывать события виджетов (закрытие, перемещение, перестановка).
 *
 * ООП:
 * - Инкапсуляция: массив виджетов скрыт как приватное поле.
 * - Полиморфизм: работает с любым виджетом через общий интерфейс UIComponent.
 * - Открытость/закрытость: новые типы виджетов добавляются через _createWidget()
 *   без изменения существующей логики.
 *
 * SRP: Dashboard отвечает только за управление коллекцией виджетов,
 * а не за их внутреннюю логику.
 */

import ToDoWidget from './ToDoWidget.js';
import QuoteWidget from './QuoteWidget.js';
import WeatherWidget from './WeatherWidget.js';
import JokeWidget from './JokeWidget.js';

export default class Dashboard {
  /**
   * @param {HTMLElement} containerEl — DOM-элемент-контейнер для виджетов
   * @param {HTMLElement} [emptyStateEl] — элемент пустого состояния
   */
  constructor(containerEl, emptyStateEl) {
    if (!containerEl) {
      throw new Error('Dashboard: требуется DOM-элемент контейнера.');
    }

    // Инкапсулированная коллекция активных виджетов
    this._widgets = [];
    this._container = containerEl;
    this._emptyState = emptyStateEl;

    // Счётчик для генерации уникальных ID
    this._idCounter = 0;

    // Реестр типов виджетов (открытость/закрытость: новые типы добавляются сюда)
    this._widgetTypes = {
      todo: { class: ToDoWidget, title: 'Список дел' },
      quote: { class: QuoteWidget, title: 'Случайная цитата' },
      weather: { class: WeatherWidget, title: 'Погода' },
      joke: { class: JokeWidget, title: 'Случайная шутка (EN)' },
    };

    // Делегирование событий на уровне контейнера
    this._setupEventDelegation();
  }

  /**
   * Создаёт виджет указанного типа.
   * @param {string} widgetType — ключ из реестра типов
   * @returns {UIComponent|null}
   * @private
   */
  _createWidget(widgetType) {
    const typeConfig = this._widgetTypes[widgetType];
    if (!typeConfig) {
      console.warn(`Dashboard: неизвестный тип виджета «${widgetType}».`);
      return null;
    }

    const id = `${widgetType}-${Date.now()}-${this._idCounter++}`;
    const widget = new typeConfig.class({
      title: typeConfig.title,
      id,
    });

    return widget;
  }

  /**
   * Добавляет виджет указанного типа на панель.
   * @param {string} widgetType
   * @returns {string|null} — ID добавленного виджета
   */
  addWidget(widgetType) {
    const widget = this._createWidget(widgetType);
    if (!widget) return null;

    const el = widget.render();

    // Слушаем события закрытия/перемещения от виджета (всплывают к контейнеру)
    this._container.appendChild(el);

    this._widgets.push(widget);
    this._updateEmptyState();

    // Прокрутка к новому виджету
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    return widget.id;
  }

  /**
   * Удаляет виджет по ID.
   * @param {string} widgetId
   */
  removeWidget(widgetId) {
    const index = this._widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) return;

    const widget = this._widgets[index];

    // Анимация удаления
    if (widget.element) {
      widget.element.classList.add('removing');
    }

    // Небольшая задержка для анимации перед фактическим удалением
    setTimeout(() => {
      widget.destroy();
      this._widgets.splice(index, 1);
      this._updateEmptyState();
    }, 200);
  }

  /**
   * Перемещает виджет вверх/вниз (кнопочная альтернатива перетаскиванию).
   * @param {string} widgetId
   * @param {number} direction — -1 (вверх) или +1 (вниз)
   */
  moveWidget(widgetId, direction) {
    const index = this._widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this._widgets.length) return;

    // Меняем местами в массиве
    [this._widgets[index], this._widgets[newIndex]] = [
      this._widgets[newIndex],
      this._widgets[index],
    ];

    // Перерисовываем порядок в DOM
    this._reorderDOM();
  }

  /**
   * Переставляет виджет fromId перед виджетом toId (drag & drop).
   * @param {string} fromId
   * @param {string} toId
   */
  reorderWidget(fromId, toId) {
    const fromIndex = this._widgets.findIndex((w) => w.id === fromId);
    const toIndex = this._widgets.findIndex((w) => w.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = this._widgets.splice(fromIndex, 1);
    this._widgets.splice(toIndex, 0, moved);

    this._reorderDOM();
  }

  /**
   * Перерисовывает порядок виджетов в DOM согласно массиву.
   * @private
   */
  _reorderDOM() {
    for (const widget of this._widgets) {
      if (widget.element) {
        this._container.appendChild(widget.element);
      }
    }
  }

  /**
   * Обновляет видимость пустого состояния.
   * @private
   */
  _updateEmptyState() {
    if (this._emptyState) {
      this._emptyState.hidden = this._widgets.length > 0;
    }
  }

  /**
   * Делегирование событий на уровне контейнера.
   * Слушает всплывающие события от виджетов.
   * @private
   */
  _setupEventDelegation() {
    this._container.addEventListener('widget:close', (e) => {
      this.removeWidget(e.detail.id);
    });

    this._container.addEventListener('widget:move', (e) => {
      this.moveWidget(e.detail.id, e.detail.direction);
    });

    this._container.addEventListener('widget:reorder', (e) => {
      this.reorderWidget(e.detail.fromId, e.detail.toId);
    });
  }

  /**
   * Возвращает список активных виджетов.
   * @returns {UIComponent[]}
   */
  getWidgets() {
    return [...this._widgets];
  }

  /**
   * Уничтожает все виджеты (очистка ресурсов).
   */
  destroyAll() {
    for (const widget of this._widgets) {
      widget.destroy();
    }
    this._widgets = [];
    this._updateEmptyState();
  }
}
