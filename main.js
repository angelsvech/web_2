/**
 * main.js
 * Главный файл приложения (ES6 module).
 *
 * Ответственность:
 * - Инициализация Dashboard.
 * - Назначение обработчиков кнопкам добавления виджетов.
 * - Управление общей структурой страницы.
 *
 * SRP: main.js отвечает только за связывание UI и Dashboard,
 * а бизнес-логика инкапсулирована в классах.
 */

import Dashboard from './js/Dashboard.js';

(function initApp() {
  'use strict';

  // DOM-элементы
  const dashboardEl = document.getElementById('dashboard');
  const emptyStateEl = document.getElementById('empty-state');

  if (!dashboardEl) {
    console.error('Не найден контейнер #dashboard.');
    return;
  }

  // Создаём экземпляр Dashboard
  const dashboard = new Dashboard(dashboardEl, emptyStateEl);

  // Кнопки добавления виджетов
  const addButtons = document.querySelectorAll('[data-widget]');

  for (const btn of addButtons) {
    const widgetType = btn.dataset.widget;
    btn.addEventListener('click', () => {
      dashboard.addWidget(widgetType);
    });
  }

  // Доступность: горячие клавиши
  // Alt+1..4 — быстрое добавление виджетов
  document.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    const map = { '1': 'todo', '2': 'quote', '3': 'weather', '4': 'joke' };
    const type = map[e.key];
    if (type) {
      e.preventDefault();
      dashboard.addWidget(type);
    }
  });

  // Добавляем стартовые виджеты для демонстрации
  dashboard.addWidget('todo');
  dashboard.addWidget('quote');
  dashboard.addWidget('weather');
  dashboard.addWidget('joke');

  // Экспорт для отладки в консоли
  window.__dashboard = dashboard;
})();
