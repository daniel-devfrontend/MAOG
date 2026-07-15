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
const mobileMenu = document.getElementById('mobileMenu');
const tables = {
  inversion: document.querySelector('#tableInversion tbody'),
  ventas: document.querySelector('#tableVentas tbody'),
  gastos: document.querySelector('#tableGastos tbody'),
  nomina: document.querySelector('#tableNomina tbody')
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
  const sales = state.ventas.reduce((sum, item) => {
    const total = Number(item.total);
    if (!Number.isNaN(total) && total !== 0) return sum + total;
    return sum + ((Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0));
  }, 0);
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
        { key: 'producto', label: 'Producto' },
        { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '0' },
        { key: 'costo', label: 'Costo', type: 'number', placeholder: '0.00', prefix: '$' },
        { key: 'porcentaje', label: 'Ganancia (%)', type: 'number', placeholder: '0', suffix: '%' },
        { key: 'precio', label: 'Precio', type: 'text', readOnly: true, prefix: '$' }
      ];
    case 'ventas':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'producto', label: 'Producto' },
        { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '0' },
        { key: 'precioUnitario', label: 'Precio unitario', type: 'number', placeholder: '0.00', prefix: '$' },
        { key: 'total', label: 'Total', type: 'text', prefix: '$', readOnly: true },
        { key: 'metodoPago', label: 'Método de pago', type: 'select', options: ['Pago móvil', 'Efectivo'] },
        { key: 'piPc', label: 'P.I / P.C', type: 'select', options: ['Pago inmediato', 'Por cobrar'] }
      ];
    case 'gastos':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'producto', label: 'Producto' },
        { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '0' },
        { key: 'costoUnidad', label: 'Costo por unidad', type: 'number', placeholder: '0.00', prefix: '$' }
      ];
    case 'nomina':
      return [
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'sueldo', label: 'Sueldo', type: 'number', placeholder: '0.00', prefix: '$' },
        { key: 'metodoPago', label: 'Método de pago', type: 'select', options: ['Pago móvil', 'Efectivo'] },
        { key: 'observaciones', label: 'Observaciones', placeholder: 'Descripción' }
      ];
    default:
      return [];
  }
}

function createInputCell(value = '', field, onChange) {
  const td = document.createElement('td');
  if (field.type === 'select') {
    const wrapper = document.createElement('div');
    wrapper.className = 'option-buttons';
    const options = field.options || [];
    options.forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option-button';
      button.textContent = option;
      if (value === option) button.classList.add('active');
      button.addEventListener('click', () => {
        onChange && onChange(option);
      });
      wrapper.appendChild(button);
    });
    td.appendChild(wrapper);
    return td;
  }

  const input = document.createElement('input');
  input.type = field.type || 'text';
  input.value = value;
  input.placeholder = field.placeholder || '';
  if (field.readOnly) {
    input.readOnly = true;
    input.tabIndex = -1;
    input.style.background = 'rgba(255,255,255,0.08)';
  }
  if (field.prefix || field.suffix) {
    const wrapper = document.createElement('div');
    wrapper.className = 'input-cell';
    if (field.prefix) {
      const prefix = document.createElement('span');
      prefix.className = 'input-prefix';
      prefix.textContent = field.prefix;
      wrapper.appendChild(prefix);
    }
    wrapper.appendChild(input);
    if (field.suffix) {
      const suffix = document.createElement('span');
      suffix.className = 'input-suffix';
      suffix.textContent = field.suffix;
      wrapper.appendChild(suffix);
    }
    td.appendChild(wrapper);
  } else {
    td.appendChild(input);
  }
  if (onChange) {
    input.addEventListener('input', event => onChange(event.target.value));
  }
  return td;
}

function formatDisplayValue(itemValue, field) {
  if (itemValue === undefined || itemValue === null || itemValue === '') {
    return '-';
  }
  return `${field.prefix || ''}${itemValue}${field.suffix || ''}`;
}

function createRow(section, item, index) {
  const fields = getSectionFields(section);
  const tr = document.createElement('tr');
  fields.forEach(field => {
    const td = document.createElement('td');
    td.textContent = formatDisplayValue(item[field.key], field);
    tr.appendChild(td);
  });
  const actionTd = document.createElement('td');
  const editBtn = document.createElement('button');
  editBtn.className = 'button secondary';
  editBtn.textContent = 'Editar';
  editBtn.addEventListener('click', () => {
    drafts[section] = { mode: 'edit', index, item: { ...item } };
    renderAll();
  });
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'button secondary';
  deleteBtn.textContent = 'Eliminar';
  deleteBtn.addEventListener('click', () => {
    state[section].splice(index, 1);
    saveState();
    renderAll();
  });
  actionTd.appendChild(editBtn);
  actionTd.appendChild(deleteBtn);
  tr.appendChild(actionTd);
  return tr;
}

function renderTable(section) {
  const tbody = tables[section];
  tbody.innerHTML = '';
  const draft = drafts[section];
  const fields = getSectionFields(section);
  if (draft) {
    const tr = document.createElement('tr');
    fields.forEach(field => {
      const td = createInputCell(draft.item[field.key] ?? '', field, value => {
        draft.item[field.key] = value;
        if (section === 'inversion' && ['costo', 'porcentaje', 'cantidad'].includes(field.key)) {
          const costo = Number(draft.item.costo) || 0;
          const porcentaje = Number(draft.item.porcentaje) || 0;
          draft.item.precio = (costo * (1 + porcentaje / 100)).toFixed(2);
        }
        if (section === 'ventas' && ['cantidad', 'precioUnitario'].includes(field.key)) {
          const cantidad = Number(draft.item.cantidad) || 0;
          const precioUnitario = Number(draft.item.precioUnitario) || 0;
          draft.item.total = (cantidad * precioUnitario).toFixed(2);
        }
        renderAll();
      });
      tr.appendChild(td);
    });
    const actionTd = document.createElement('td');
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
    actionTd.appendChild(saveBtn);
    actionTd.appendChild(cancelBtn);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  }
  state[section].forEach((item, index) => tbody.appendChild(createRow(section, item, index)));
}

function renderAll() {
  Object.keys(tables).forEach(renderTable);
  calculateTotals();
}

function addRow(section) {
  drafts[section] = { mode: 'new', item: getBlankEntry(section) };
  renderAll();
}

function switchSection(event) {
  sectionButtons.forEach(button => button.classList.toggle('active', button === event.currentTarget));
  const target = event.currentTarget.dataset.section;
  sections.forEach(section => section.id === target ? section.classList.add('active') : section.classList.remove('active'));
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
  addButtons.forEach(button => button.addEventListener('click', () => addRow(button.dataset.add)));
  downloadCsvButton.addEventListener('click', downloadCsv);

renderAll();
