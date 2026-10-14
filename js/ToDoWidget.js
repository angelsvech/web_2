/**
 * ToDoWidget.js
 * Виджет «Список дел» — наследник UIComponent.
 *
 * Ответственность: управление списком задач (добавление, удаление, отметка выполнения).
 * Данные хранятся как инкапсулированное свойство класса (массив задач).
 *
 * ООП:
 * - Наследование: расширяет UIComponent, переопределяет renderBody().
 * - Инкапсуляция: массив задач и DOM-элементы скрыты как приватные поля.
 * - Полиморфизм: Dashboard вызывает render()/destroy() единообразно для всех виджетов.
 */

import UIComponent from './UIComponent.js';

export default class ToDoWidget extends UIComponent {
  /**
   * @param {Object} config
   * @param {string} config.title
   * @param {string} config.id
   */
  constructor(config) {
    super({ ...config, icon: '✅' });
    // Инкапсулированное состояние задач
    this._tasks = [];
    // Приватные ссылки на DOM (создаются в renderBody)
    this._inputEl = null;
    this._listEl = null;
    this._statsEl = null;
  }

  /**
   * Создаёт содержимое тела виджета.
   */
  renderBody() {
    const body = this._bodyEl;

    // Строка ввода
    const inputRow = document.createElement('div');
    inputRow.className = 'todo-input-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-input';
    input.placeholder = 'Новая задача…';
    input.setAttribute('aria-label', 'Текст новой задачи');

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary btn-sm';
    addBtn.textContent = 'Добавить';

    inputRow.append(input, addBtn);
    body.appendChild(inputRow);

    // Список задач
    const list = document.createElement('ul');
    list.className = 'todo-list';
    body.appendChild(list);

    // Статистика
    const stats = document.createElement('div');
    stats.className = 'todo-stats';
    body.appendChild(stats);

    // Сохраняем ссылки
    this._inputEl = input;
    this._listEl = list;
    this._statsEl = stats;

    // Привязываем обработчики (с сохранением для удаления)
    this._bindHandler(addBtn, 'click', () => this._handleAdd());
    this._bindHandler(input, 'keydown', (e) => {
      if (e.key === 'Enter') this._handleAdd();
    });

    // Делегирование событий списка
    this._bindHandler(list, 'click', (e) => this._handleListClick(e));

    // Первичная отрисовка
    this._renderTasks();
    this._updateStats();
  }

  /**
   * Добавляет задачу в массив и перерисовывает список.
   * @private
   */
  _handleAdd() {
    const text = this._inputEl.value.trim();
    if (!text) return;

    const task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      done: false,
    };

    this._tasks.push(task);
    this._inputEl.value = '';
    this._inputEl.focus();

    this._renderTasks();
    this._updateStats();
  }

  /**
   * Обрабатывает клики по списку (делегирование).
   * @private
   */
  _handleListClick(e) {
    const item = e.target.closest('.todo-item');
    if (!item) return;

    const taskId = item.dataset.taskId;

    // Клик по чекбоксу → отметка выполнения
    if (e.target.classList.contains('todo-checkbox')) {
      const task = this._tasks.find((t) => t.id === taskId);
      if (task) {
        task.done = e.target.checked;
        item.classList.toggle('done', task.done);
        this._updateStats();
      }
      return;
    }

    // Клик по кнопке удаления
    if (e.target.classList.contains('todo-delete')) {
      this._removeTask(taskId);
    }
  }

  /**
   * Удаляет задачу по id.
   * @private
   */
  _removeTask(taskId) {
    this._tasks = this._tasks.filter((t) => t.id !== taskId);
    this._renderTasks();
    this._updateStats();
  }

  /**
   * Перерисовывает список задач в DOM.
   * Использует createElement/textContent — без innerHTML.
   * @private
   */
  _renderTasks() {
    this._listEl.replaceChildren();

    if (this._tasks.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'todo-empty';
      empty.textContent = 'Список задач пуст. Добавьте первую задачу выше.';
      this._listEl.appendChild(empty);
      return;
    }

    for (const task of this._tasks) {
      const li = document.createElement('li');
      li.className = 'todo-item';
      if (task.done) li.classList.add('done');
      li.dataset.taskId = task.id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute('aria-label', 'Отметить задачу выполненной');

      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = task.text; // безопасно: textContent, не innerHTML

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'todo-delete';
      deleteBtn.textContent = '✕';
      deleteBtn.setAttribute('aria-label', 'Удалить задачу');

      li.append(checkbox, text, deleteBtn);
      this._listEl.appendChild(li);
    }
  }

  /**
   * Обновляет строку статистики.
   * @private
   */
  _updateStats() {
    const total = this._tasks.length;
    const done = this._tasks.filter((t) => t.done).length;
    const remaining = total - done;
    this._statsEl.textContent = `Всего: ${total} · Выполнено: ${done} · Осталось: ${remaining}`;
  }
}
