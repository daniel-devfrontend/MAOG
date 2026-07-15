const STORAGE_KEY = 'modapro-admin-data';
const defaultData = {
  inversion: [],
  ventas: [],
  gastos: [],
  nomina: []
};
const state = loadState();
const drafts = {
  inversion: null,
  ventas: null,
  gastos: null,
  nomina: null
};
const sectionButtons = document.querySelectorAll('.tab');
const sections = document.querySelectorAll('.panel-section');
const addButtons = document.querySelectorAll('[data-add]');
const downloadCsvButton = document.getElementById('downloadCsv');
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const tables = {
  inversion: document.querySelector('#tableInversion tbody'),
  ventas: document.querySelector('#tableVentas tbody'),
  gastos: document.querySelector('#tableGastos tbody'),
  nomina: document.querySelector('#tableNomina tbody')
};
const totals = {
  totalSales: document.getElementById('totalSales'),
  totalExpenses: document.getElementById('totalExpenses'),
  totalInvestment: document.getElementById('totalInvestment'),
  totalPayroll: document.getElementById('totalPayroll')
};
const cards = {
  inversion: document.getElementById('cardsInversion'),
  ventas: document.getElementById('cardsVentas'),
  gastos: document.getElementById('cardsGastos'),
  nomina: document.getElementById('cardsNomina')
};
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultData));
  } catch (error) {
    console.warn('Error al cargar datos:', error);
    return JSON.parse(JSON.stringify(defaultData));
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function formatMoney(value) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}
function calculateTotals() {
  const inv = state.inversion.reduce((sum, item) => sum + (Number(item.costo) || 0) * (Number(item.cantidad) || 0), 0);
  const exp = state.gastos.reduce((sum, item) => sum + (Number(item.costoUnidad) || 0) * (Number(item.cantidad) || 0), 0);
  const payroll = state.nomina.reduce((sum, item) => sum + (Number(item.sueldo) || 0), 0);
  const ventasTotal = state.ventas.reduce((sum, item) => {
    const parts = item.piPc ? item.piPc.split('/').map(value => Number(value.trim())) : [];
    const amount = parts.length === 2 ? (Number(parts[0]) || 0) + (Number(parts[1]) || 0) : 0;
    return sum + amount;
  }, 0);
  totals.totalInvestment.textContent = formatMoney(inv);
  totals.totalExpenses.textContent = formatMoney(exp);
  totals.totalPayroll.textContent = formatMoney(payroll);
  totals.totalSales.textContent = formatMoney(ventasTotal);
}
function calculatePrecio(costo, porcentaje) {
  const costValue = Number(costo) || 0;
  const percentValue = Number(porcentaje) || 0;
  return costValue * (1 + percentValue / 100);
}
function createInputCell(value = '', type = 'text', placeholder = '', suffix = '', readOnly = false, label = '') {
  const td = document.createElement('td');
  if (label) td.dataset.label = label;
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  if (readOnly) {
    input.readOnly = true;
    input.tabIndex = -1;
  }
  if (suffix) {
    const wrapper = document.createElement('div');
    wrapper.className = 'input-cell';
    const suffixSpan = document.createElement('span');
    suffixSpan.className = 'input-suffix';
    suffixSpan.textContent = suffix;
    wrapper.appendChild(input);
    wrapper.appendChild(suffixSpan);
    td.appendChild(wrapper);
  } else {
    td.appendChild(input);
  }
  return td;
}
function createDisplayCell(value = '', label = '') {
  const td = document.createElement('td');
  if (label) td.dataset.label = label;
  td.textContent = value;
  return td;
}
function getBlankEntry(section) {
  return getSectionFields(section).reduce((entry, field) => {
    entry[field.key] = '';
    return entry;
  }, {});
}
function createActionMenuCell(section, index, label = '') {
  const td = document.createElement('td');
  if (label) td.dataset.label = label;
  td.className = 'action-cell';

  const menuWrapper = document.createElement('div');
  menuWrapper.className = 'menu-wrapper';

  const menuButton = document.createElement('button');
  menuButton.type = 'button';
  menuButton.className = 'menu-trigger';
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = '⋯';
  menuButton.addEventListener('click', event => {
    event.stopPropagation();
    const isOpen = menuWrapper.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  const menuList = document.createElement('div');
  menuList.className = 'menu-list';

  const editItem = document.createElement('button');
  editItem.type = 'button';
  editItem.className = 'menu-item';
  editItem.textContent = 'Editar';
  editItem.addEventListener('click', event => {
    event.stopPropagation();
    drafts[section] = {
      mode: 'edit',
      item: { ...state[section][index] },
      index
    };
    menuWrapper.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    renderAll();
  });

  const deleteItem = document.createElement('button');
  deleteItem.type = 'button';
  deleteItem.className = 'menu-item';
  deleteItem.textContent = 'Eliminar';
  deleteItem.addEventListener('click', event => {
    event.stopPropagation();
    state[section].splice(index, 1);
    menuWrapper.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    renderAll();
  });

  menuList.appendChild(editItem);
  menuList.appendChild(deleteItem);
  menuWrapper.appendChild(menuButton);
  menuWrapper.appendChild(menuList);
  td.appendChild(menuWrapper);
  return td;
}
function getSectionFields(section) {
  switch (section) {
    case 'inversion':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'producto', label: 'Producto' },
        { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '0' },
        { key: 'costo', label: 'Costo', type: 'number', placeholder: '0.00' },
        { key: 'porcentaje', label: 'Ganancia (%)', type: 'number', placeholder: '0', suffix: '%' },
        { key: 'precio', label: 'Precio', type: 'text', placeholder: '0.00', readOnly: true }
      ];
    case 'ventas':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'producto', label: 'Producto' },
        { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '0' },
        { key: 'metodoPago', label: 'Método de pago' },
        { key: 'piPc', label: 'P.I / P.C', placeholder: 'P.I/P.C' }
      ];
    case 'gastos':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'producto', label: 'Producto' },
        { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '0' },
        { key: 'costoUnidad', label: 'Costo por unidad', type: 'number', placeholder: '0.00' }
      ];
    case 'nomina':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'sueldo', label: 'Sueldo', type: 'number', placeholder: '0.00' },
        { key: 'metodoPago', label: 'Método de pago' },
        { key: 'observaciones', label: 'Observaciones', placeholder: 'Descripción' }
      ];
    default:
      return [];
  }
}
function updateInversionPrecio(index) {
  const item = state.inversion[index];
  if (!item) return '0.00';
  const precio = calculatePrecio(item.costo, item.porcentaje).toFixed(2);
  item.precio = precio;
  return precio;
}
function createCardRow(label, value) {
  const row = document.createElement('div');
  row.className = 'card-row';
  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  const valueEl = document.createElement('strong');
  valueEl.textContent = value || '-';
  row.appendChild(labelEl);
  row.appendChild(valueEl);
  return row;
}
function createCardActions(section, index) {
  const actionContainer = document.createElement('div');
  actionContainer.className = 'card-actions';
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'button secondary';
  editButton.textContent = 'Editar';
  editButton.addEventListener('click', () => {
    drafts[section] = {
      mode: 'edit',
      item: { ...state[section][index] },
      index
    };
    renderAll();
  });
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'button secondary';
  deleteButton.textContent = 'Eliminar';
  deleteButton.addEventListener('click', () => {
    state[section].splice(index, 1);
    renderAll();
  });
  actionContainer.appendChild(editButton);
  actionContainer.appendChild(deleteButton);
  return actionContainer;
}
function createDraftCard(section) {
  const draft = drafts[section];
  if (!draft) return null;
  const fields = getSectionFields(section);
  const card = document.createElement('div');
  card.className = 'card-item draft-card';
  fields.forEach(field => {
    const row = document.createElement('div');
    row.className = 'card-row';
    const labelEl = document.createElement('span');
    labelEl.textContent = field.label || field.key;
    row.appendChild(labelEl);
    const input = document.createElement('input');
    input.type = field.type || 'text';
    input.value = draft.item[field.key] || '';
    input.placeholder = field.placeholder || '';
    if (field.readOnly) {
      input.readOnly = true;
      input.tabIndex = -1;
      input.style.background = '#f3f4f6';
    }
    if (field.suffix) {
      const wrapper = document.createElement('div');
      wrapper.className = 'input-cell';
      const suffixEl = document.createElement('span');
      suffixEl.className = 'input-suffix';
      suffixEl.textContent = field.suffix;
      wrapper.appendChild(input);
      wrapper.appendChild(suffixEl);
      row.appendChild(wrapper);
    } else {
      row.appendChild(input);
    }
    if (input && !field.readOnly) {
      input.addEventListener('input', event => {
        draft.item[field.key] = event.target.value;
        if (section === 'inversion' && (field.key === 'costo' || field.key === 'porcentaje')) {
          draft.item.precio = calculatePrecio(draft.item.costo, draft.item.porcentaje).toFixed(2);
          const priceField = fields.find(f => f.key === 'precio');
          if (priceField) {
            // no extra action needed, value updates automatically from draft.item
          }
        }
      });
    }
    card.appendChild(row);
  });
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'button primary';
  saveButton.textContent = draft.mode === 'edit' ? 'Guardar' : 'Agregar';
  saveButton.addEventListener('click', () => {
    if (draft.mode === 'edit' && typeof draft.index === 'number') {
      state[section][draft.index] = { ...draft.item };
    } else {
      state[section].push({ ...draft.item });
    }
    drafts[section] = null;
    saveState();
    renderAll();
  });
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'button secondary';
  cancelButton.textContent = 'Cancelar';
  cancelButton.addEventListener('click', () => {
    drafts[section] = null;
    renderAll();
  });
  actions.appendChild(saveButton);
  actions.appendChild(cancelButton);
  card.appendChild(actions);
  return card;
}
function renderCards(section) {
  const container = cards[section];
  if (!container) return;
  container.innerHTML = '';
  const draftCard = createDraftCard(section);
  if (draftCard) {
    container.appendChild(draftCard);
  }
  state[section].forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'card-item';
    getSectionFields(section).forEach(field => {
      card.appendChild(createCardRow(field.label || field.key, item[field.key] || '-'));
    });
    card.appendChild(createCardActions(section, index));
    container.appendChild(card);
  });
}
function renderTable(section) {
  const tbody = tables[section];
  tbody.innerHTML = '';
  const draft = drafts[section];
  const fields = getSectionFields(section);
  if (draft) {
    const row = document.createElement('tr');
    row.className = 'draft-row';
    fields.forEach(field => {
      const value = draft.item[field.key] || '';
      const cell = createInputCell(value, field.type || 'text', field.placeholder || '', field.suffix || '', field.readOnly || false, field.label || '');
      const input = cell.querySelector('input');
      if (input && !field.readOnly) {
        input.addEventListener('input', event => {
          draft.item[field.key] = event.target.value;
          if (section === 'inversion' && (field.key === 'costo' || field.key === 'porcentaje')) {
            draft.item.precio = calculatePrecio(draft.item.costo, draft.item.porcentaje).toFixed(2);
            const priceIndex = fields.findIndex(f => f.key === 'precio');
            const priceCell = row.querySelectorAll('td')[priceIndex];
            const priceInput = priceCell ? priceCell.querySelector('input') : null;
            if (priceInput) {
              priceInput.value = draft.item.precio;
            }
          }
        });
      }
      row.appendChild(cell);
    });
    const actionCell = document.createElement('td');
    actionCell.className = 'draft-action-cell';
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'button primary';
    saveButton.textContent = draft.mode === 'edit' ? 'Guardar' : 'Agregar';
    saveButton.addEventListener('click', () => {
      if (draft.mode === 'edit' && typeof draft.index === 'number') {
        state[section][draft.index] = { ...draft.item };
      } else {
        state[section].push({ ...draft.item });
      }
      drafts[section] = null;
      saveState();
      renderAll();
    });
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button secondary';
    cancelButton.textContent = 'Cancelar';
    cancelButton.addEventListener('click', () => {
      drafts[section] = null;
      renderAll();
    });
    actionCell.appendChild(saveButton);
    actionCell.appendChild(cancelButton);
    row.appendChild(actionCell);
    tbody.appendChild(row);
  }
  state[section].forEach((item, index) => {
    if (draft && draft.mode === 'edit' && draft.index === index) {
      return;
    }
    const row = document.createElement('tr');
    fields.forEach(field => {
      const value = item[field.key] || '';
      row.appendChild(createDisplayCell(value, field.label || ''));
    });
    row.appendChild(createActionMenuCell(section, index, 'Acciones'));
    tbody.appendChild(row);
  });
}
function renderAll() {
  Object.keys(tables).forEach(section => {
    renderTable(section);
    renderCards(section);
  });
  calculateTotals();
  saveState();
}
function addRow(section) {
  if (drafts[section]) {
    return;
  }
  drafts[section] = {
    mode: 'new',
    item: getBlankEntry(section)
  };
  renderAll();
  const sectionElement = document.getElementById(section);
  const firstInput = sectionElement.querySelector('tbody tr input');
  if (firstInput) {
    firstInput.focus();
  }
}
function switchSection(event) {
  sectionButtons.forEach(button => button.classList.toggle('active', button === event.currentTarget));
  const target = event.currentTarget.dataset.section;
  sections.forEach(section => section.id === target ? section.classList.add('active') : section.classList.remove('active'));
}
function buildCsv() {
  const rows = [];
  const names = { inversion: 'Inversion', ventas: 'Ventas', gastos: 'Gastos', nomina: 'Nomina' };
  Object.entries(state).forEach(([section, items]) => {
    if (!items.length) return;
    const fields = getSectionFields(section);
    rows.push([names[section]]);
    rows.push(fields.map(field => field.key.toUpperCase()));
    items.forEach(item => {
      rows.push(fields.map(field => item[field.key] || ''));
    });
    rows.push(['']);
  });
  return rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
}
function closeAllMenus() {
  document.querySelectorAll('.menu-wrapper.open').forEach(wrapper => {
    wrapper.classList.remove('open');
    const button = wrapper.querySelector('.menu-trigger');
    if (button) {
      button.setAttribute('aria-expanded', 'false');
    }
  });
}

document.addEventListener('click', closeAllMenus);

function downloadCsv() {
  const csv = buildCsv();
  if (!csv) return alert('No hay datos para exportar.');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'admin-ropa.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
sectionButtons.forEach(button => button.addEventListener('click', event => {
  switchSection(event);
  if (mobileMenu) {
    mobileMenu.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
}));
addButtons.forEach(button => button.addEventListener('click', () => addRow(button.dataset.add)));
downloadCsvButton.addEventListener('click', downloadCsv);
if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    mobileMenu.setAttribute('aria-hidden', String(!open));
    menuToggle.setAttribute('aria-expanded', String(open));
  });
}
renderAll();
