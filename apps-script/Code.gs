const SPREADSHEET_ID = '1WDVFZDBmVF13OyjBGr4q56eqO49xtqR181tRwXuFqJA';
const WHATSAPP_DESTINO = '558530318830';

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Aba não encontrada: ' + name);
  return sh;
}

function doGet(e) {
  return json_({ ok: true, app: 'CBS Waves Plus Compras', ts: new Date().toISOString() });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'register') return json_(register_(body));
    if (body.action === 'order') return json_(order_(body));
    return json_({ ok: false, error: 'Ação inválida' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function register_(body) {
  const sh = sheet_('Clientes');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) throw new Error('E-mail obrigatório');
    const lastRow = sh.getLastRow();
    const values = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, 11).getValues() : [];
    const idx = values.findIndex(r => String(r[6] || '').trim().toLowerCase() === email);
    const now = new Date();
    if (idx >= 0) {
      const row = idx + 2;
      sh.getRange(row, 3, 1, 7).setValues([[
        body.name || values[idx][2],
        body.company || values[idx][3],
        body.document || values[idx][4],
        body.phone || values[idx][5],
        email,
        body.passwordHash || values[idx][7],
        true
      ]]);
      sh.getRange(row, 10).setValue(now);
      sh.getRange(row, 11).setValue(body.origin || 'App CBS/Waves Plus');
      return { ok: true, id: values[idx][0], updated: true };
    }
    const id = 'CLI-' + Utilities.formatDate(now, Session.getScriptTimeZone() || 'America/Fortaleza', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    sh.appendRow([
      id, now, body.name || '', body.company || '', body.document || '', body.phone || '', email,
      body.passwordHash || '', true, now, body.origin || 'App CBS/Waves Plus'
    ]);
    return { ok: true, id, created: true };
  } finally {
    lock.releaseLock();
  }
}

function findClientIdByEmail_(email) {
  if (!email) return '';
  const sh = sheet_('Clientes');
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return '';
  const values = sh.getRange(2, 1, lastRow - 1, 7).getValues();
  const needle = String(email).trim().toLowerCase();
  const row = values.find(r => String(r[6] || '').trim().toLowerCase() === needle);
  return row ? row[0] : '';
}

function order_(body) {
  const sh = sheet_('Pedidos');
  const itemsSh = sheet_('Itens_Pedido');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const o = body.order || {};
    if (!o.id) throw new Error('ID do pedido obrigatório');
    const email = String((o.user && o.user.email) || body.email || '').trim().toLowerCase();
    const clientId = findClientIdByEmail_(email);
    const created = o.createdAt ? new Date(o.createdAt) : new Date();
    const rowData = [
      o.id, created, clientId,
      (o.user && o.user.name) || '',
      (o.user && o.user.company) || '',
      (o.user && o.user.phone) || '',
      o.status || 'Pronto para enviar',
      Number(o.total || 0),
      o.notes || '',
      WHATSAPP_DESTINO,
      o.message || ''
    ];

    const lastRow = sh.getLastRow();
    const ids = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, 1).getValues().flat() : [];
    const idx = ids.findIndex(v => String(v) === String(o.id));
    if (idx >= 0) sh.getRange(idx + 2, 1, 1, 11).setValues([rowData]);
    else sh.appendRow(rowData);

    const itemLast = itemsSh.getLastRow();
    if (itemLast > 1) {
      const itemIds = itemsSh.getRange(2, 1, itemLast - 1, 1).getValues().flat();
      for (let i = itemIds.length - 1; i >= 0; i--) {
        if (String(itemIds[i]) === String(o.id)) itemsSh.deleteRow(i + 2);
      }
    }

    (o.products || []).forEach(p => {
      const unit = p.minimumText || p.minimum || '';
      const unitPrice = p.price == null ? '' : Number(p.price);
      const subtotal = p.price == null ? '' : Number(p.price) * Number(p.qty || 0);
      itemsSh.appendRow([o.id, p.code || '', p.name || '', Number(p.qty || 0), unit, unitPrice, subtotal]);
    });

    return { ok: true, id: o.id, clientId, status: o.status || 'Pronto para enviar' };
  } finally {
    lock.releaseLock();
  }
}
