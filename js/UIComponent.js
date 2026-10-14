/**
 * UIComponent.js
 * Базовый (абстрактный) класс для всех виджетов дашборда.
 *
 * Ответственность: создание каркаса виджета (header + body + controls),
 * общие методы жизненного цикла: render(), destroy(), minimize(), close().
 *
 * Принципы ООП:
 * - Инкапсуляция: внутреннее состояние (DOM, id, title) скрыто как поля класса.
 * - Наследование: конкретные виджеты расширяют UIComponent и переопределяют renderBody().
 * - Полиморфизм: Dashboard работает с виджетами через общий интерфейс render()/destroy().
 *
 * SRP: этот класс отвечает только за каркас и жизненный цикл,
 * а не за специфичную логику конкретных виджетов.
 */

export default class UIComponent {
  /**
   * @param {Object} config - конфигурация виджета
   * @param {string} config.title - заголовок виджета
   * @param {string} config.id - уникальный идентификатор
   * @param {string} [config.icon] - эмодзи-иконка
   */
  constructor(config) {
    if (new.target === UIComponent) {
      throw new Error('UIComponent — абстрактный класс. Создавайте конкретные подклассы.');
    }

    const { title, id, icon = '' } = config;

    if (!title || !id) {
      throw new Error('UIComponent: обязательны параметры title и id.');
    }

    // Инкапсулированные поля
    this.title = title;
    this.id = id;
    this.icon = icon;

    // Корневой DOM-элемент (создаётся в render())
    this.element = null;

    // Ссылки на внутренние элементы
    this._bodyEl = null;
    this._headerEl = null;
    this._titleEl = null;

    // Массив обработчиков для корректного удаления
    this._eventListeners = [];

    // Массив интервалов (для подклассов, использующих setInterval)
    this._intervals = [];

    // Массив AbortController для отмены незавершённых запросов
    this._abortControllers = [];

    // Состояние свёрнутости
    this._minimized = false;

    // Признак уничтожения
    this._destroyed = false;
  }

  /**
   * Создаёт и возвращает корневой DOM-элемент виджета.
   * Подклассы переопределяют renderBody() для наполнения содержимым.
   * @returns {HTMLElement}
   */
  render() {
    const widget = document.createElement('article');
    widget.className = 'widget';
    widget.dataset.widgetId = this.id;
    widget.setAttribute('aria-label', this.title);

    // --- Заголовок ---
    const header = document.createElement('header');
    header.className = 'widget-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'widget-title-wrap';

    if (this.icon) {
      const iconEl = document.createElement('span');
      iconEl.className = 'widget-icon';
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.textContent = this.icon;
      titleWrap.appendChild(iconEl);
    }

    const titleEl = document.createElement('h2');
    titleEl.className = 'widget-title';
    titleEl.textContent = this.title;
    titleWrap.appendChild(titleEl);

    header.appendChild(titleWrap);

    // --- Кнопки управления ---
    const controls = document.createElement('div');
    controls.className = 'widget-controls';

    // Кнопочная альтернатива перетаскиванию: переместить вверх
    const upBtn = this._createControlButton('widget-up-btn', '▲', 'Переместить виджет вверх');
    const downBtn = this._createControlButton('widget-down-btn', '▼', 'Переместить виджет вниз');
    const minBtn = this._createControlButton('widget-minimize-btn', '', 'Свернуть виджет');
    const closeBtn = this._createControlButton('btn-danger', '✕', 'Закрыть виджет');

    controls.append(upBtn, downBtn, minBtn, closeBtn);
    header.appendChild(controls);
    widget.appendChild(header);

    // --- Тело ---
    const body = document.createElement('div');
    body.className = 'widget-body';
    widget.appendChild(body);

    // Сохраняем ссылки
    this.element = widget;
    this._headerEl = header;
    this._bodyEl = body;
    this._titleEl = titleEl;

    // Привязываем обработчики (с сохранением ссылок для удаления)
    this._bindHandler(upBtn, 'click', () => this._emitMove(-1));
    this._bindHandler(downBtn, 'click', () => this._emitMove(1));
    this._bindHandler(minBtn, 'click', () => this.minimize());
    this._bindHandler(closeBtn, 'click', () => this.close());

    // Перетаскивание (drag & drop) — с кнопочной альтернативой выше
    this._setupDragDrop();

    // Делегирование: подклассы наполняют тело
    this.renderBody();

    return widget;
  }

  /**
   * Создаёт кнопку управления в заголовке.
   * @private
   */
  _createControlButton(className, label, ariaLabel) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn-icon ${className}`;
    btn.setAttribute('aria-label', ariaLabel);
    btn.textContent = label;
    return btn;
  }

  /**
   * Регистрирует обработчик и сохраняет ссылку для последующего removeEventListener.
   * @protected
   */
  _bindHandler(target, eventType, handler) {
    target.addEventListener(eventType, handler);
    this._eventListeners.push({ target, eventType, handler });
  }

  /**
   * Регистрирует setInterval и сохраняет id для очистки в destroy().
   * @protected
   */
  _registerInterval(callback, delay) {
    const intervalId = setInterval(callback, delay);
    this._intervals.push(intervalId);
    return intervalId;
  }

  /**
   * Создаёт новый AbortController и сохраняет его для отмены при destroy().
   * @protected
   * @returns {AbortController}
   */
  _createAbortController() {
    const controller = new AbortController();
    this._abortControllers.push(controller);
    return controller;
  }

  /**
   * Отменяет все активные AbortController (устаревшие запросы).
   * @protected
   */
  _abortAll() {
    for (const controller of this._abortControllers) {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }
    this._abortControllers = [];
  }

  /**
   * Сворачивает/разворачивает виджет.
   */
  minimize() {
    if (this._destroyed) return;
    this._minimized = !this._minimized;
    this.element.classList.toggle('minimized', this._minimized);
  }

  /**
   * Закрывает виджет: инициирует удаление через Dashboard.
   */
  close() {
    if (this._destroyed) return;
    this.element.dispatchEvent(
      new CustomEvent('widget:close', {
        bubbles: true,
        detail: { id: this.id },
      })
    );
  }

  /**
   * Сигнализирует дашборду о перемещении виджета.
   * @private
   */
  _emitMove(direction) {
    this.element.dispatchEvent(
      new CustomEvent('widget:move', {
        bubbles: true,
        detail: { id: this.id, direction },
      })
    );
  }

  /**
   * Настраивает drag & drop для перестановки виджетов.
   * Кнопочная альтернатива (▲/▼) уже добавлена выше.
   * @private
   */
  _setupDragDrop() {
    const header = this._headerEl;
    header.setAttribute('tabindex', '0');
    header.setAttribute('role', 'button');
    header.setAttribute('aria-label', `Перетащите, чтобы переместить виджет «${this.title}». Или используйте кнопки со стрелками.`);

    header.draggable = true;

    this._bindHandler(header, 'dragstart', (e) => {
      if (this._destroyed) return;
      e.dataTransfer.setData('text/plain', this.id);
      e.dataTransfer.effectAllowed = 'move';
      this.element.classList.add('dragging');
    });

    this._bindHandler(header, 'dragend', () => {
      this.element.classList.remove('dragging');
    });

    this._bindHandler(this.element, 'dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.element.classList.add('drag-over');
    });

    this._bindHandler(this.element, 'dragleave', () => {
      this.element.classList.remove('drag-over');
    });

    this._bindHandler(this.element, 'drop', (e) => {
      e.preventDefault();
      this.element.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== this.id) {
        this.element.dispatchEvent(
          new CustomEvent('widget:reorder', {
            bubbles: true,
            detail: { fromId: draggedId, toId: this.id },
          })
        );
      }
    });

    // Клавиатурная альтернатива перетаскиванию: Enter/Space на заголовке → перемещение вверх
    this._bindHandler(header, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._emitMove(-1);
      }
    });
  }

  /**
   * Абстрактный метод: подклассы наполняют тело виджета содержимым.
   * Должен быть переопределён.
   */
  renderBody() {
    throw new Error('renderBody() должен быть реализован в подклассе.');
  }

  /**
   * Корректно удаляет виджет из DOM и очищает все ресурсы:
   * - снимает все зарегистрированные обработчики событий
   * - очищает все setInterval
   * - отменяет все незавершённые fetch-запросы (AbortController)
   * - удаляет корневой элемент из DOM
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    // Отмена незавершённых запросов
    this._abortAll();

    // Очистка интервалов
    for (const intervalId of this._intervals) {
      clearInterval(intervalId);
    }
    this._intervals = [];

    // Снятие обработчиков событий
    for (const { target, eventType, handler } of this._eventListeners) {
      target.removeEventListener(eventType, handler);
    }
    this._eventListeners = [];

    // Хук для подклассов: очистка специфичных ресурсов
    if (typeof this.cleanup === 'function') {
      this.cleanup();
    }

    // Удаление из DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this._bodyEl = null;
    this._headerEl = null;
    this._titleEl = null;
  }
}
