/**
 * QuoteWidget.js
 * Виджет «Случайная цитата» — наследник UIComponent.
 *
 * Ответственность: отображение случайной цитаты и кнопка «Обновить».
 * Цитаты хранятся в массиве прямо в классе (по требованию задания).
 *
 * ООП:
 * - Наследование: расширяет UIComponent, переопределяет renderBody().
 * - Инкапсуляция: массив цитат и индекс скрыты как приватные поля.
 * - Открытость/закрытость: класс расширяется новыми виджетами без изменения этого кода.
 */

import UIComponent from './UIComponent.js';

export default class QuoteWidget extends UIComponent {
  /**
   * @param {Object} config
   * @param {string} config.title
   * @param {string} config.id
   */
  constructor(config) {
    super({ ...config, icon: '💬' });

    // Инкапсулированный массив цитат (хранится в классе)
    this._quotes = [
      { text: 'Единственный способ делать великие дела — любить то, что делаешь.', author: 'Стив Джобс' },
      { text: 'Не считай дни, пусть дни считаются.', author: 'Мухаммед Али' },
      { text: 'Будь собой; все остальные роли уже заняты.', author: 'Оскар Уайльд' },
      { text: 'Великие дела не делаются вдруг.', author: 'Софокл' },
      { text: 'Падая семь раз, поднимайся восемь.', author: 'Японская пословица' },
      { text: 'Лучшая месть — огромный успех.', author: 'Фрэнк Синатра' },
      { text: 'Жизнь — это то, что с тобой происходит, пока ты строишь другие планы.', author: 'Джон Леннон' },
      { text: 'Делай, что должен, и будь, что будет.', author: 'Марк Аврелий' },
      { text: 'Тот, кто хочет — ищет возможности, кто не хочет — ищет причины.', author: 'Сократ' },
      { text: 'Начинай делать то, что необходимо; затем делай то, что возможно; и вдруг ты делаешь невозможное.', author: 'Франциск Ассизский' },
    ];

    this._currentIndex = 0;
    this._quoteTextEl = null;
    this._quoteAuthorEl = null;
  }

  renderBody() {
    const body = this._bodyEl;

    const content = document.createElement('div');
    content.className = 'quote-content';

    const mark = document.createElement('span');
    mark.className = 'quote-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '«';

    const text = document.createElement('blockquote');
    text.className = 'quote-text';

    const author = document.createElement('cite');
    author.className = 'quote-author';

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'btn btn-ghost quote-refresh-btn';
    refreshBtn.textContent = '🔄 Обновить';

    content.append(mark, text, author);
    body.appendChild(content);
    body.appendChild(refreshBtn);

    this._quoteTextEl = text;
    this._quoteAuthorEl = author;

    this._bindHandler(refreshBtn, 'click', () => this._showNextQuote());

    this._showRandomQuote();
  }

  /**
   * Показывает следующую случайную цитату (отличную от текущей).
   * @private
   */
  _showNextQuote() {
    if (this._quotes.length <= 1) {
      this._renderQuote(this._quotes[0]);
      return;
    }

    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * this._quotes.length);
    } while (newIndex === this._currentIndex);

    this._currentIndex = newIndex;
    this._renderQuote(this._quotes[newIndex]);
  }

  /**
   * Показывает случайную цитату при инициализации.
   * @private
   */
  _showRandomQuote() {
    const index = Math.floor(Math.random() * this._quotes.length);
    this._currentIndex = index;
    this._renderQuote(this._quotes[index]);
  }

  /**
   * Отрисовывает цитату в DOM (безопасно: textContent, не innerHTML).
   * @private
   */
  _renderQuote(quote) {
    this._quoteTextEl.textContent = `"${quote.text}"`;
    this._quoteAuthorEl.textContent = `— ${quote.author}`;
  }
}
