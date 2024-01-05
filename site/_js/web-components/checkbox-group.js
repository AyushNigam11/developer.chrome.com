
import {BaseElement} from './base-element';
import {html} from 'lit-element';
import {debounce} from '../utils/debounce';
import {unsafeSVG} from 'lit-html/directives/unsafe-svg';
import caretIcon from '../../_includes/icons/caret-down.svg';

import {store} from '../store';
import {setFilter} from '../actions/filter';

/**
 * @type {HTMLElement}
 */
class CheckboxGroup extends BaseElement {
  constructor() {
    super();

    this._handleMassSelect = this._handleMassSelect.bind(this);
    this._handleShowMore = this._handleShowMore.bind(this);
    this._checkOption = this._checkOption.bind(this);
    this._computeAllSelected = debounce(
      this._computeAllSelected.bind(this),
      10
    );

    this.setAttribute('enhanced', '');

    this.elements = {
      initialChildren: Array.from(this.children),
      checkboxes: this._getCheckboxes(),
    };

    this.name = this._getName();
    this.show = 4;
    this.i18n = {};
  }

  static get properties() {
    return {
      allSelected: {type: Boolean, reflect: true},
      show: {type: Number, reflect: true},
      i18n: {type: Object, reflect: true},
    };
  }

  connectedCallback() {
    super.connectedCallback();
    store.subscribe(this.onStoreUpdate.bind(this));

    this.elements.massSelectButton = this.querySelector(
      '.checkbox-group__mass-select'
    );

    this.elements.showMoreButton = this.querySelector(
      '.checkbox-group__show-more'
    );

    this.elements.checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', this._checkOption);
      checkbox.addEventListener('change', this._computeAllSelected);
    });

    this._computeAllSelected();
  }

  /**
   * Checks if the app state contains entries for this select, and if so
   * sets the value to the entries.
   * @param {*} state
   */
  onStoreUpdate(state) {
    const filters = state.filters || {};
    const entries = filters[this.name] || [];

    for (const index in this.elements.checkboxes) {
      const checkbox = this.elements.checkboxes[index];
      checkbox.checked = entries.some(entry => entry.value === checkbox.value);
    }

    this._computeAllSelected();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.elements.checkboxes.forEach(checkbox => {
      checkbox.removeEventListener('change', this._computeAllSelected);
    });

    this.elements.massSelectButton.removeEventListener(
      'click',
      this._handleMassSelect
    );
  }

  render() {
    return html`
      <button
        class="checkbox-group__mass-select button button-text type--h6 color-primary"
        @click="${this._handleMassSelect}"
      >
        ${this.allSelected ? this.i18n.reset : this.i18n.select_all}
      </button>

      <div>${this.elements.initialChildren.slice(0, this.show)}</div>

      ${this._renderShowMoreButton()}
    `;
  }

  /**
   * @return {TemplateResult|undefined}
   */
  _renderShowMoreButton() {
    if (this.show >= this.elements.checkboxes.length) return;

    return html`
      <button
        class="checkbox-group__show-more button button-text type--h6 color-primary display-flex align-center"
        @click="${this._handleShowMore}"
      >
        ${unsafeSVG(caretIcon)} More
      </button>
    `;
  }

  _computeAllSelected() {
    const checked = this.elements.checkboxes
      .filter(checkbox => checkbox.disabled === false)
      .find(checkbox => checkbox.checked === false);

    this.allSelected = checked === undefined;
  }

  _checkOption() {
    const checked = this.elements.checkboxes
      .filter(checkbox => checkbox.checked === true)
      .map(checkbox => ({
        label: checkbox.nextSibling?.textContent,
        value: checkbox.value,
      }));
    setFilter(this.name, checked);
  }

  /**
   * @param {MouseEvent } e
   */
  _handleMassSelect(e) {
    e.preventDefault();

    const allSelected = this.allSelected;

    this.elements.checkboxes.forEach(checkbox => {
      if (
        (allSelected && !checkbox.checked) ||
        (!allSelected && checkbox.checked) ||
        checkbox.disabled
      )
        return;

      checkbox.checked = !allSelected;
      checkbox.dispatchEvent(new Event('change'));
    });

    this.show = this.elements.checkboxes.length;
  }

  /**
   * @param {MouseEvent }e
   */
  _handleShowMore(e) {
    e.preventDefault();

    this.show = this.elements.checkboxes.length;
  }

  /**
   * @returns {HTMLInputElement[]}
   */
  _getCheckboxes() {
    return Array.from(this.querySelectorAll('input[type="checkbox"]'));
  }

  /**
   * @returns {string}
   * @private
   */
  _getName() {
    return this.elements.checkboxes[0].name;
  }
}

customElements.define('checkbox-group', CheckboxGroup);
