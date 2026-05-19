export default class ModalController {
    constructor(formatMoney) {
        this.formatMoney = formatMoney;
        this.initListeners();
    }

    initListeners() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-target');
                document.getElementById(targetId).classList.remove('active');
            });
        });
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('active');
            });
        });
    }

    renderGridPantallas(pantallas, callbackSelect) {
        const modalBox = document.querySelector('#modal-pantallas .modal-box');
        if (modalBox) {
            modalBox.style.setProperty('width', '95vw', 'important');
            modalBox.style.setProperty('max-width', '1400px', 'important');
        }

        const grid = document.getElementById('md-grid');
        grid.classList.remove('pantallas-grid');
        grid.style.setProperty('display', 'block', 'important');
        grid.style.setProperty('width', '100%', 'important');
        
        let rowsHtml = pantallas.map(p => {
            let totalCapex = 0;
            if (p.carasVV) {
                Object.values(p.carasVV).forEach(cara => {
                    Object.keys(cara).forEach(k => {
                        if (k !== 'costoAnterior') totalCapex += (Number(cara[k]) || 0);
                    });
                });
            } else {
                Object.values(p.capex).forEach(val => totalCapex += (Number(val) || 0));
            }

            const totalOpex = p.gastosOperacion.reduce((sum, op) => {
                let opSum = 0;
                Object.keys(op).forEach(k => { if(k !== 'mes' && k !== 'pauta') opSum += (Number(op[k]) || 0); });
                return sum + opSum;
            }, 0);

            const totalMantto = p.tickets.reduce((sum, tk) => sum + (Number(tk.costoManttoOriginal) || 0), 0);

            return `
                <tr class="pantalla-row" style="border-bottom: 1px solid var(--border); cursor: pointer; transition: 0.2s;" 
                    onmouseover="this.style.backgroundColor='var(--theme-light)'" 
                    onmouseout="this.style.backgroundColor='transparent'"
                    data-id="${p.id}">
                    <td style="padding: 12px; font-weight: 700; font-family: monospace; color: var(--text-muted); white-space: nowrap;">${p.id}</td>
                    <td style="padding: 12px; font-weight: 600; color: var(--text-main); width: 100%; min-width: 350px; white-space: normal;">${p.nombre}</td>
                    <td style="padding: 12px; font-family: 'JetBrains Mono', monospace; font-weight: 800; white-space: nowrap;">${this.formatMoney(totalCapex)}</td>
                    <td style="padding: 12px; font-family: 'JetBrains Mono', monospace; font-weight: 800; white-space: nowrap;">${this.formatMoney(totalOpex)}</td>
                    <td style="padding: 12px; font-family: 'JetBrains Mono', monospace; font-weight: 800; color: var(--theme-color); white-space: nowrap;">${this.formatMoney(totalMantto)}</td>
                </tr>
            `;
        }).join('');

        grid.innerHTML = `
            <div style="margin-bottom: 15px; width: 100%; display: block;">
                <input type="text" id="modal-table-search" placeholder="🔍 Buscar pantalla por ID o Ubicación..." 
                       style="width: 100%; box-sizing: border-box; padding: 12px 16px; border-radius: 8px; border: 2px solid var(--border); font-size: 1rem; outline: none; font-family: 'Inter', sans-serif; transition: 0.2s;">
            </div>
            <div style="width: 100%; overflow-x: auto; max-height: 60vh; background: #fff; border-radius: 8px; border: 1px solid var(--border); display: block;">
                <table style="width: 100%; min-width: 1000px; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
                    <thead style="position: sticky; top: 0; z-index: 10;">
                        <tr style="background: var(--theme-light); border-bottom: 2px solid var(--theme-color);">
                            <th style="padding: 15px 12px; color: var(--theme-color); font-weight: 900; white-space: nowrap;">ID Pantalla</th>
                            <th style="padding: 15px 12px; color: var(--theme-color); font-weight: 900; white-space: nowrap;">Ubicación</th>
                            <th style="padding: 15px 12px; color: var(--theme-color); font-weight: 900; white-space: nowrap;">CAPEX</th>
                            <th style="padding: 15px 12px; color: var(--theme-color); font-weight: 900; white-space: nowrap;">OPERACIÓN</th>
                            <th style="padding: 15px 12px; color: var(--theme-color); font-weight: 900; white-space: nowrap;">MANTENIMIENTO</th>
                        </tr>
                    </thead>
                    <tbody id="modal-table-body">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;

        const searchInput = document.getElementById('modal-table-search');
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            grid.querySelectorAll('.pantalla-row').forEach(row => {
                const text = row.innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });

        grid.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('click', () => {
                document.getElementById('modal-pantallas').classList.remove('active');
                callbackSelect(row.getAttribute('data-id'));
            });
        });

        document.getElementById('modal-pantallas').classList.add('active');
        setTimeout(() => searchInput.focus(), 100);
    }

    renderExpedienteCompleto(pantalla, diccionarios, mes) {
        const modalBox = document.querySelector('#modal-data .modal-box');
        if (modalBox) {
            modalBox.style.setProperty('width', '850px', 'important');
        }

        document.getElementById('md-title').textContent = pantalla.id;
        document.getElementById('md-sub').textContent = pantalla.nombre;
        
        const mapUrl = `https://maps.google.com/maps?q=${pantalla.lat},${pantalla.lng}&hl=es&z=16&output=embed`;
        const fotoRealUrl = `assets/fotos/${pantalla.id}.jpg`;

        let html = `
            <div class="media-grid">
                <div class="media-box">
                    <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="${mapUrl}"></iframe>
                </div>
                <div class="media-box" style="background: #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #64748b; text-align: center; position: relative;">
                    <span style="position: absolute; padding: 20px; font-size: 0.8rem; z-index: 1;">
                        <b style="color:#475569;">FOTO NO DISPONIBLE</b><br><br>Sube tu foto real a:<br>assets/fotos/${pantalla.id}.jpg
                    </span>
                    <img src="${fotoRealUrl}" onerror="this.style.display='none'" alt="Fotografía de la pantalla ${pantalla.id}" style="width: 100%; height: 100%; object-fit: cover; display: block; position: relative; z-index: 2;">
                </div>
            </div>
            
            <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace; text-align: center; margin-top: -15px; margin-bottom: 25px;">
                COORDENADAS DE DB: ${pantalla.lat}, ${pantalla.lng}
            </div>
        `;

        let totalCapex = 0;
        let capexRows = '';

        if (pantalla.carasVV) {
            Object.keys(pantalla.carasVV).forEach(cara => {
                capexRows += `<div style="font-weight: 900; color: var(--theme-color); margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; font-size: 0.8rem;">CARA ${cara}</div>`;
                Object.keys(diccionarios.capex).forEach(k => {
                    const label = typeof diccionarios.capex[k] === 'object' ? diccionarios.capex[k].label : diccionarios.capex[k];
                    const val = pantalla.carasVV[cara][k] || 0;
                    if (val > 0) {
                        totalCapex += val;
                        capexRows += `<div class="exp-row"><span>${label}</span> <b>${this.formatMoney(val)}</b></div>`;
                    }
                });
            });
        } else {
            Object.keys(diccionarios.capex).forEach(k => {
                const label = typeof diccionarios.capex[k] === 'object' ? diccionarios.capex[k].label : diccionarios.capex[k];
                const val = pantalla.capex[k] || 0;
                if (val > 0) {
                    totalCapex += val;
                    capexRows += `<div class="exp-row"><span>${label}</span> <b>${this.formatMoney(val)}</b></div>`;
                }
            });
        }

        html += `
            <div class="mod-section">
                <div class="mod-title">1. INVERSIÓN INICIAL (CAPEX)</div>
                ${capexRows || '<div style="color:#aaa; font-style:italic; font-size:0.8rem;">Sin datos registrados</div>'}
                <div class="mod-subtotal">Subtotal CAPEX: <span style="color: var(--theme-color);">${this.formatMoney(totalCapex)}</span></div>
            </div>
        `;

        let totalOpex = 0;
        let opexRows = '';
        const mesFiltro = mes.toLowerCase().replace(/[^a-z0-9]/g, '');
        const registrosMes = pantalla.gastosOperacion.filter(o => mesFiltro === 'all' || o.mes === mesFiltro);

        Object.keys(diccionarios.operacion).forEach(k => {
            const label = typeof diccionarios.operacion[k] === 'object' ? diccionarios.operacion[k].label : diccionarios.operacion[k];
            const val = registrosMes.reduce((acc, o) => acc + (o[k] || 0), 0);
            if (val > 0) {
                totalOpex += val;
                opexRows += `<div class="exp-row"><span>${label}</span> <b>${this.formatMoney(val)}</b></div>`;
            }
        });

        html += `
            <div class="mod-section">
                <div class="mod-title">2. GASTOS DE OPERACIÓN ${mes !== 'all' ? '(' + mes + ')' : '(Histórico)'}</div>
                ${opexRows || '<div style="color:#aaa; font-style:italic; font-size:0.8rem;">Sin gastos operativos en este periodo</div>'}
                <div class="mod-subtotal">Subtotal OPEX: <span style="color: var(--theme-color);">${this.formatMoney(totalOpex)}</span></div>
            </div>
        `;

        let totalMantto = 0;
        const ticketsMes = pantalla.tickets.filter(tk => mesFiltro === 'all' || tk.mes === mesFiltro);
        
        let ticketsHTML = ticketsMes.map(tk => {
            totalMantto += (Number(tk.costoManttoOriginal) || 0);
            
            const insumoStr = String(tk.insumo).trim();
            const refaccStr = String(tk.refaccion).trim();
            
            // 🔥 Lógica que ignora los NA de Excel pero imprime el resto 🔥
            const iVal = (insumoStr && insumoStr !== '0' && !/^n\/?a$/i.test(insumoStr)) ? insumoStr : 'Ninguno';
            const rVal = (refaccStr && refaccStr !== '0' && !/^n\/?a$/i.test(refaccStr)) ? refaccStr : 'Ninguna';
            
            const iCost = tk.costoInsumo > 0 ? ` <span style="color:var(--theme-color); font-weight:900;">(${this.formatMoney(tk.costoInsumo)})</span>` : '';
            const rCost = tk.costoRefaccion > 0 ? ` <span style="color:var(--theme-color); font-weight:900;">(${this.formatMoney(tk.costoRefaccion)})</span>` : '';
            const tCost = tk.transporte > 0 ? this.formatMoney(tk.transporte) : '$0';
            const gCost = tk.gasolina > 0 ? ` <span style="color:var(--theme-color); font-weight:900;">(+ Gasolina: ${this.formatMoney(tk.gasolina)})</span>` : '';

            const extrasDiv = `
            <div style="margin-top: 6px; padding: 8px; background-color: #f1f5f9; border-radius: 6px; border-left: 4px solid #64748b;">
                <div style="font-size: 0.75rem; color: #334155; margin-bottom: 4px;"><span style="font-weight: 800;">Insumo:</span> ${iVal}${iCost}</div>
                <div style="font-size: 0.75rem; color: #334155; margin-bottom: 4px;"><span style="font-weight: 800;">Refacción:</span> ${rVal}${rCost}</div>
                <div style="font-size: 0.75rem; color: #334155;"><span style="font-weight: 800;">Transporte:</span> <span style="font-weight:900;">${tCost}</span>${gCost}</div>
            </div>`;

            return `
            <div class="ticket-card" style="margin-bottom: 10px;">
                <div class="ticket-header">
                    <div class="ticket-id" style="text-transform: capitalize; color: var(--text-main); font-size: 0.85rem;">${tk.actividad}</div>
                    <div class="ticket-status status-cerrado" style="background: var(--theme-light); color: var(--theme-color); border: none; font-size: 0.85rem;" title="Costo Puro de Mantenimiento">${this.formatMoney(tk.costoManttoPuro)}</div>
                </div>
                <div class="ticket-desc" style="color: var(--text-muted); font-size: 0.75rem;"><b>Causa / Motivo:</b> ${tk.causa}</div>
                ${extrasDiv}
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #eee; padding-top: 8px; margin-top: 10px;">
                    <span style="font-size: 0.75rem; color: #888; font-weight: 600;">${tk.fechaCorta} <span style="color: var(--theme-color); text-transform: capitalize;">(${tk.mes})</span></span>
                    <span style="font-size: 0.65rem; color: #aaa;">Total Reportado: ${this.formatMoney(tk.costoManttoOriginal)}</span>
                </div>
            </div>`;
        }).join('');

        html += `
            <div class="mod-section">
                <div class="mod-title">3. MANTENIMIENTO E INCIDENCIAS ${mes !== 'all' ? '(' + mes + ')' : '(Histórico)'}</div>
                <div class="ticket-list">
                    ${ticketsHTML || '<div style="color:#aaa; font-style:italic; font-size:0.8rem; text-align: center;">No hay tickets registrados en este periodo</div>'}
                </div>
                <div class="mod-subtotal" style="border-top: 1px solid var(--border); padding-top: 15px;">Subtotal MANTTO: <span style="color: var(--theme-color);">${this.formatMoney(totalMantto)}</span></div>
            </div>
        `;

        document.getElementById('md-lbl-total').style.display = 'none';
        document.getElementById('md-total').style.display = 'none';
        document.getElementById('md-breakdown').innerHTML = html;
        document.getElementById('modal-data').classList.add('active');
    }

    renderResumenGeneral(unidad, moduloActual, dbManager, mes) {
        document.getElementById('md-title').textContent = "RESUMEN GENERAL: " + unidad;
        document.getElementById('md-sub').textContent = "Módulo: " + moduloActual.toUpperCase() + " | Mes: " + mes.toUpperCase();
        
        const sumas = dbManager.getSumasConsolidadas(unidad, moduloActual, mes);
        const granTotal = dbManager.getGranTotal(sumas);

        document.getElementById('md-lbl-total').style.display = 'block';
        document.getElementById('md-total').style.display = 'block';
        document.getElementById('md-total').textContent = this.formatMoney(granTotal);

        let diccActual = dbManager.diccionarios[moduloActual];
        let html = '';

        if (moduloActual === 'mantenimiento') {
            html += `<div style="font-weight: 800; color: var(--theme-color); margin-top: 10px; margin-bottom: 8px;">MANTENIMIENTO PREVENTIVO</div>`;
            Object.keys(diccActual.preventivo.sub).forEach(k => {
                const val = sumas[k] || 0;
                if(val > 0) html += `<div class="data-row"><span>${diccActual.preventivo.sub[k]}</span><span class="val">${this.formatMoney(val)}</span></div>`;
            });
            html += `<div style="font-weight: 800; color: var(--theme-color); margin-top: 20px; margin-bottom: 8px;">MANTENIMIENTO CORRECTIVO</div>`;
            Object.keys(diccActual.correctivo.sub).forEach(k => {
                const val = sumas[k] || 0;
                if(val > 0) html += `<div class="data-row"><span>${diccActual.correctivo.sub[k]}</span><span class="val">${this.formatMoney(val)}</span></div>`;
            });
        } else {
            Object.keys(sumas).forEach(k => {
                const label = typeof diccActual[k] === 'object' ? diccActual[k].label : diccActual[k];
                const val = sumas[k] || 0;
                if(val > 0) html += `<div class="data-row"><span>${label}</span><span class="val">${this.formatMoney(val)}</span></div>`;
            });
        }

        document.getElementById('md-breakdown').innerHTML = html;
        document.getElementById('modal-data').classList.add('active');
    }
}