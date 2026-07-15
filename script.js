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
const hamburgerToggle = document.getElementById('hamburgerToggle');
const navClose = document.getElementById('navClose');
const mobileMenu = document.getElementById('mobileMenu');
const sectionBodies = {
  inversion: document.getElementById('bodyInversion'),
  ventas: document.getElementById('bodyVentas'),
  gastos: document.getElementById('bodyGastos'),
  nomina: document.getElementById('bodyNomina')
};
const totals = {
  totalSales: document.getElementById('totalSales'),
  totalInvestment: document.getElementById('totalInvestment'),
  totalExpenses: document.getElementById('totalExpenses'),
  totalPayroll: document.getElementById('totalPayroll'),
  totalProfit: document.getElementById('totalProfit'),
  totalInventory: document.getElementById('totalInventory')
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
  const sales = state.ventas.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const investment = state.inversion.reduce((sum, item) => sum + (Number(item.costo) || 0) * (Number(item.cantidad) || 0), 0);
  const expenses = state.gastos.reduce((sum, item) => sum + (Number(item.costoUnidad) || 0) * (Number(item.cantidad) || 0), 0);
  const payroll = state.nomina.reduce((sum, item) => sum + (Number(item.sueldo) || 0), 0);
  const profit = sales - (investment + expenses + payroll);
  const inventoryCount = state.inversion.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);

  totals.totalSales.textContent = formatMoney(sales);
  totals.totalInvestment.textContent = formatMoney(investment);
  totals.totalExpenses.textContent = formatMoney(expenses);
  totals.totalPayroll.textContent = formatMoney(payroll);
  totals.totalProfit.textContent = formatMoney(profit);
  totals.totalInventory.textContent = `${inventoryCount} uds`;
}

function getBlankEntry(section) {
  const fields = {
    inversion: ['fecha', 'producto', 'cantidad', 'costo', 'porcentaje', 'precio'],
    ventas: ['fecha', 'cliente', 'producto', 'cantidad', 'precioUnitario', 'total', 'metodoPago', 'piPc'],
    gastos: ['fecha', 'producto', 'cantidad', 'costoUnidad'],
    nomina: ['fecha', 'sueldo', 'metodoPago', 'observaciones']
  };
  return fields[section].reduce((obj, key) => {
    obj[key] = '';
    return obj;
  }, {});
}

function getSectionFields(section) {
  switch (section) {
    case 'inversion':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'producto', label: 'Producto', type: 'text', placeholder: 'Ej. Jeans' },
        { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '0' },
        { key: 'costo', label: 'Costo unidad', type: 'number', placeholder: '0.00' },
        { key: 'porcentaje', label: 'Margen (%)', type: 'number', placeholder: '20' },
        { key: 'precio', label: 'Precio venta', type: 'text', readOnly: true }
      ];
    case 'ventas':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'cliente', label: 'Cliente', type: 'text', placeholder: 'Nombre' },
        { key: 'producto', label: 'Producto', type: 'text', placeholder: 'Artículo' },
        { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '0' },
        { key: 'precioUnitario', label: 'Precio unidad', type: 'number', placeholder: '0.00' },
        { key: 'total', label: 'Total', type: 'text', readOnly: true },
        { key: 'metodoPago', label: 'Método de pago', type: 'select', options: ['Pago móvil', 'Efectivo'] },
        { key: 'piPc', label: 'Estado', type: 'select', options: ['Pago inmediato', 'Por cobrar'] }
      ];
    case 'gastos':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'producto', label: 'Concepto', type: 'text', placeholder: 'Transporte' },
        { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '0' },
        { key: 'costoUnidad', label: 'Costo unidad', type: 'number', placeholder: '0.00' }
      ];
    case 'nomina':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'sueldo', label: 'Sueldo', type: 'number', placeholder: '0.00' },
        { key: 'metodoPago', label: 'Método de pago', type: 'select', options: ['Pago móvil', 'Efectivo'] },
        { key: 'observaciones', label: 'Observaciones', type: 'text', placeholder: 'Descripción' }
      ];
    default:
      return [];
  }
}

function createInputField(field, value, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'compact-field';
  const label = document.createElement('label');
  label.textContent = field.label;
  const input = field.type === 'select' ? document.createElement('select') : document.createElement('input');
  input.type = field.type === 'select' ? 'text' : field.type || 'text';
  input.value = value || '';
  input.placeholder = field.placeholder || '';
  input.disabled = Boolean(field.readOnly);
  input.addEventListener('input', event => onChange(event.target.value));
  if (field.type === 'select') {
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecciona...';
    input.appendChild(defaultOption);
    field.options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = option;
      optionElement.selected = value === option;
      input.appendChild(optionElement);
    });
  }
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}

function createItemCard(section, item, index) {
  const card = document.createElement('article');
  card.className = 'item-card';
  const fields = getSectionFields(section);
  fields.forEach(field => {
    if (field.key === 'total' && !item[field.key]) return;
    const row = document.createElement('div');
    row.className = 'item-row';
    const caption = document.createElement('span');
    caption.textContent = field.label;
    const value = document.createElement('strong');
    let text = item[field.key] || '-';
    if (field.type === 'date' && text) text = text;
    if ((field.key === 'precio' || field.key === 'total' || field.key === 'costo' || field.key === 'costoUnidad' || field.key === 'precioUnitario' || field.key === 'sueldo') && text !== '-') {
      text = formatMoney(Number(text) || 0);
    }
    value.textContent = text;
    row.appendChild(caption);
    row.appendChild(value);
    card.appendChild(row);
  });
  const actions = document.createElement('div');
  actions.className = 'item-actions';
  const editBtn = document.createElement('button');
  editBtn.className = 'button secondary';
  editBtn.textContent = 'Editar';
  editBtn.addEventListener('click', () => openDraft(section, 'edit', { ...item }, index));
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'button secondary';
  deleteBtn.textContent = 'Eliminar';
  deleteBtn.addEventListener('click', () => {
    state[section].splice(index, 1);
    saveState();
    renderAll();
  });
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  card.appendChild(actions);
  return card;
}

function createForm(section, draft) {
  const wrapper = document.createElement('article');
  wrapper.className = 'form-card';
  const fields = getSectionFields(section);
  fields.forEach(field => {
    const fieldValue = draft.item[field.key] || '';
    const inputField = createInputField(field, fieldValue, value => {
      draft.item[field.key] = value;
      if (section === 'inversion' && ['costo', 'porcentaje'].includes(field.key)) {
        const costo = Number(draft.item.costo) || 0;
        const porcentaje = Number(draft.item.porcentaje) || 0;
        draft.item.precio = (costo * (1 + porcentaje / 100)).toFixed(2);
      }
      if (section === 'ventas' && ['cantidad', 'precioUnitario'].includes(field.key)) {
        const cantidad = Number(draft.item.cantidad) || 0;
        const precioUnitario = Number(draft.item.precioUnitario) || 0;
        draft.item.total = (cantidad * precioUnitario).toFixed(2);
      }
    });
    wrapper.appendChild(inputField);
  });

  const actionRow = document.createElement('div');
  actionRow.className = 'action-row';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'button primary';
  saveBtn.textContent = 'Guardar';
  saveBtn.addEventListener('click', () => {
    if (draft.mode === 'edit') {
      state[section][draft.index] = { ...draft.item };
    } else {
      state[section].push({ ...draft.item });
    }
    drafts[section] = null;
    saveState();
    renderAll();
  });
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'button secondary';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', () => {
    drafts[section] = null;
    renderAll();
  });
  actionRow.appendChild(saveBtn);
  actionRow.appendChild(cancelBtn);
  wrapper.appendChild(actionRow);
  return wrapper;
}

function renderSection(section) {
  const container = sectionBodies[section];
  container.innerHTML = '';
  const draft = drafts[section];
  if (draft) {
    container.appendChild(createForm(section, draft));
  }
  if (!state[section].length) {
    const empty = document.createElement('article');
    empty.className = 'empty-card';
    empty.innerHTML = `<span>Sin registros aún</span><strong>Agrega tu primer registro</strong>`;
    container.appendChild(empty);
    return;
  }
  state[section].forEach((item, index) => container.appendChild(createItemCard(section, item, index)));
}

function renderAll() {
  Object.keys(sectionBodies).forEach(renderSection);
  calculateTotals();
  updateNavActive();
}

function openDraft(section, mode = 'new', item = null, index = null) {
  drafts[section] = { mode, index, item: item ? { ...item } : getBlankEntry(section) };
  renderSection(section);
}

function addRow(section) {
  openDraft(section, 'new');
}

function switchSection(event) {
  sectionButtons.forEach(button => button.classList.toggle('active', button === event.currentTarget));
  const target = event.currentTarget.dataset.section;
  sections.forEach(section => section.id === target ? section.classList.add('active') : section.classList.remove('active'));
}

function updateNavActive() {
  const activeId = Array.from(sections).find(section => section.classList.contains('active'))?.id;
  sectionButtons.forEach(button => button.classList.toggle('active', button.dataset.section === activeId));
}

function buildCsv() {
  const rows = [];
  Object.entries(state).forEach(([section, items]) => {
    if (!items.length) return;
    rows.push([section.toUpperCase()]);
    const fields = getSectionFields(section);
    rows.push(fields.map(field => field.label));
    items.forEach(item => rows.push(fields.map(field => item[field.key] || '')));
    rows.push(['']);
  });
  return rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
}

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
  mobileMenu.classList.remove('open');
  hamburgerToggle.setAttribute('aria-expanded', 'false');
  mobileMenu.setAttribute('aria-hidden', 'true');
}));

hamburgerToggle.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburgerToggle.setAttribute('aria-expanded', String(isOpen));
  mobileMenu.setAttribute('aria-hidden', String(!isOpen));
});

navClose.addEventListener('click', () => {
  mobileMenu.classList.remove('open');
  hamburgerToggle.setAttribute('aria-expanded', 'false');
  mobileMenu.setAttribute('aria-hidden', 'true');
});

mobileMenu.addEventListener('click', event => {
  if (event.target === mobileMenu) {
    mobileMenu.classList.remove('open');
    hamburgerToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
  }
});

addButtons.forEach(button => button.addEventListener('click', () => addRow(button.dataset.add)));
downloadCsvButton.addEventListener('click', downloadCsv);

renderAll();
