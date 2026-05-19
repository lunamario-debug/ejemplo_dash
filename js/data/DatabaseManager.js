import { CapexDiccionario } from '../config/Capex.js';
import { OperacionDiccionario } from '../config/Operacion.js';
import { MantenimientoDiccionario } from '../config/Mantenimiento.js';
import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm';

const corregirTexto = (texto) => {
    if (!texto) return '';
    let txt = String(texto);
    const mapaMojibake = {
        'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
        'Ã±': 'ñ', 'Ã‘': 'Ñ',
        'Ã ': 'Á', 'Ã‰': 'É', 'Ã ': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú',
        'Ã¼': 'ü', 'Â°': '°', 'Ã ': 'à', 'Ã¨': 'è', 'Â': '',
        'est\uFFFDtico': 'estético',
        'Est\uFFFDtico': 'Estético',
        'Est\uFFFDTico': 'Estético',
        'M\uFFFDdulo': 'Módulo',
        'm\uFFFDdulo': 'módulo',
        'Da\uFFFDado': 'Dañado',
        'da\uFFFDado': 'dañado',
        'da\uFFFDo': 'daño',
        'termomagn\uFFFDtico': 'termomagnético',
        'l\uFFFDnea': 'línea',
        'obstrucci\uFFFDn': 'obstrucción',
        'f\uFFFDsica': 'física',
        'c\uFFFDmara': 'cámara',
        'actualizaci\uFFFDn': 'actualización',
        'refacci\uFFFDn': 'refacción',
        'puata': 'pauta',
        'Garffiti': 'Graffiti'
    };
    for (let mal in mapaMojibake) {
        txt = txt.split(mal).join(mapaMojibake[mal]);
    }
    return txt.trim();
};

const normalizarFiltro = (texto) => {
    return (texto || '').toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
};

const getVal = (obj, posiblesNombres) => {
    if (!obj) return null;
    const keys = Object.keys(obj);
    for (let nombre of posiblesNombres) {
        if (keys.includes(nombre) && obj[nombre] != null && obj[nombre] !== '') return obj[nombre];
    }
    for (let nombre of posiblesNombres) {
        const searchKey = nombre.toLowerCase().trim();
        const found = keys.find(k => k.toLowerCase().trim() === searchKey);
        if (found && obj[found] != null && obj[found] !== '') return obj[found];
    }
    return null;
};

const getExactDinero = (obj, exactMatches) => {
    for (const k of Object.keys(obj)) {
        const str = k.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
        if (exactMatches.includes(str)) {
            return Number(String(obj[k] || 0).replace(/[^0-9.-]+/g, "")) || 0;
        }
    }
    return 0;
};

const getExact = (obj, posiblesNombres) => {
    for(let p of posiblesNombres) {
        if(obj[p] !== undefined && obj[p] !== null && obj[p] !== '') return obj[p];
    }
    const keys = Object.keys(obj);
    for(let p of posiblesNombres) {
        const cleanP = p.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanP);
        if(found && obj[found] !== undefined && obj[found] !== null && obj[found] !== '') return obj[found];
    }
    return null;
};

const extraerMesFuerte = (filaObj) => {
    let m = getVal(filaObj, ['Mes', 'mes', 'periodo', 'MES']);
    if (m) return String(m).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const mesesValidos = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    for (const val of Object.values(filaObj)) {
        if (!val) continue;
        const s = String(val).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (mesesValidos.includes(s)) return s;
    }
    return 'all';
};

const formatearFecha = (fechaRaw) => {
    if (!fechaRaw) return 'Sin fecha';
    const num = Number(fechaRaw);
    if (!isNaN(num) && num > 20000) {
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        const dia = String(date.getUTCDate()).padStart(2, '0');
        const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
        const anio = date.getUTCFullYear();
        return `${dia}/${mes}/${anio}`;
    }
    return String(fechaRaw).split(' ')[0];
};

export default class DatabaseManager {
    constructor() {
        this.diccionarios = {
            capex: CapexDiccionario,
            operacion: OperacionDiccionario,
            mantenimiento: MantenimientoDiccionario
        };
        
        this.diccionarios.operacion.gasolina = "Gasolina (Rutas)";
        this.diccionarios.operacion.transporte = "Transporte (Rutas)";
        this.rawData = [];
    }

    async consultarTablaCSV(urlArchivo) {
        return new Promise((resolve) => {
            Papa.parse(urlArchivo, {
                download: true,
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (err) => {
                    console.warn(`Aviso: No se pudo cargar la tabla ${urlArchivo}.`, err);
                    resolve([]); 
                }
            });
        });
    }

    async cargarDatosJSON() {
        try {
            const limpiarDinero = (val) => Number(String(val || 0).replace(/[^0-9.-]+/g, "")) || 0;

            const [
                capexEco, opEco, tkEco,
                capexVV, opVV, tkVV
            ] = await Promise.all([
                this.consultarTablaCSV('data_files/capex_ecovallas.csv'),
                this.consultarTablaCSV('data_files/operacion.csv'), 
                this.consultarTablaCSV('data_files/tickets.csv'),
                this.consultarTablaCSV('data_files/capex_viaverde.csv'),
                this.consultarTablaCSV('data_files/operacion_viaverde.csv'),
                this.consultarTablaCSV('data_files/tickets_viaverde.csv') 
            ]);

            const procesarFilaCapex = (fila, unidadDefecto) => {
                const idPantalla = String(getExact(fila, ['id_de_pantalla', 'ID de pantalla', 'id', 'sitio']) || 'SIN_ID').trim();
                const nombreSitio = corregirTexto(getExact(fila, ['Nombre', 'Ubicacion', 'Ubicación', 'Sitio']) || idPantalla);

                const orientacion = String(getExact(fila, ['Orientacion', 'Orientación']) || 'unica').toLowerCase().trim();
                const costoRenovacion = limpiarDinero(getExact(fila, ['Renovación tecnólogica pantalla', 'Renovación tecnologica pantalla']));
                const costoPantallaBase = limpiarDinero(getExact(fila, ['Pantalla']));
                
                let cPantalla = costoPantallaBase;
                let cAnterior = 0;

                if (unidadDefecto === 'VIA VERDE' && costoRenovacion > 0) {
                    cPantalla = costoRenovacion;
                    cAnterior = costoPantallaBase;
                }

                const cObra = limpiarDinero(getExact(fila, ['Obra civil']));
                const cEst = limpiarDinero(getExact(fila, ['Estructura']));
                const cModEstructura = limpiarDinero(getExact(fila, ['Modificación estructura']));

                const cMed = limpiarDinero(getExact(fila, ['Medidor CFE']));
                const cInst = limpiarDinero(getExact(fila, ['Instalación eléctrica', 'InstalaciÃ³n elÃ©ctrica', 'Instalacion electrica']));
                const cNova = limpiarDinero(getExact(fila, ['Sending SD 300', 'Sending / Novastar', 'Sending card']));
                const cUps = limpiarDinero(getExact(fila, ['UPS CyberPower de 1000VA', 'UPS']));
                const cNuc = limpiarDinero(getExact(fila, ['Nuc', 'NUC', 'Nuc ASUS BOXNUC1513I, Intel Core i5']));
                const cPTri = limpiarDinero(getExact(fila, ['Interruptor termomagnético trifásica 3X100Amp', 'Interruptor_termomagnetico_trifasica_3x100 amp']));
                const cP20A = limpiarDinero(getExact(fila, ['Interrruptor termomagnética 2X20Amp', 'Interruptor termomagnético 2X20Amp', 'Interruptor 2x20 amp']));
                const cCam = limpiarDinero(getExact(fila, ['Cámara', 'Camara', 'Cámara HIKVISION Modelo : DS-2CD2347G2P-LSU/SL']));
                const cTel = limpiarDinero(getExact(fila, ['Teltonika Rut 955', 'teltonika_rut_955']));
                const cPoe = limpiarDinero(getExact(fila, ['Poe Utepo', 'Poe_utepo']));

                // 🔥 INYECCIÓN DE TICKET DE ESTRUCTURA 🔥
                let pseudoTicketEstructura = null;
                if (cModEstructura > 0) {
                    pseudoTicketEstructura = {
                        actividad: 'Modificación de Estructura',
                        causa: 'Adecuación en sitio (Extraído de CAPEX)',
                        fechaCorta: 'Histórico',
                        mes: 'all', // Se guardará en consolidado
                        insumo: 'Ninguno',
                        costoInsumo: 0,
                        refaccion: 'Ninguna',
                        costoRefaccion: 0,
                        transporte: 0,
                        gasolina: 0,
                        costoManttoOriginal: cModEstructura,
                        costoManttoPuro: cModEstructura
                    };
                }

                let p = this.rawData.find(x => x.id === idPantalla);

                if (p) {
                    p.capex.costoPantalla += cPantalla;
                    p.capex.obraCivil += cObra;
                    p.capex.costoEstructura += cEst;
                    p.capex.costoMedidor += cMed;
                    p.capex.costoInstalacion += cInst;
                    p.capex.novastar += cNova;
                    p.capex.ups += cUps;
                    p.capex.nuc += cNuc;
                    p.capex.pastillaTri += cPTri;
                    p.capex.pastilla20A += cP20A;
                    p.capex.camara += cCam;
                    p.capex.teltonika += cTel;
                    p.capex.poe += cPoe;
                    if (pseudoTicketEstructura) p.tickets.push(pseudoTicketEstructura);
                } else {
                    p = {
                        id: idPantalla,
                        unidad: unidadDefecto, 
                        nombre: nombreSitio, 
                        lat: 19.4326, lng: -99.1332,
                        capex: { costoPantalla: cPantalla, obraCivil: cObra, costoEstructura: cEst, costoMedidor: cMed, costoInstalacion: cInst, novastar: cNova, ups: cUps, nuc: cNuc, pastillaTri: cPTri, pastilla20A: cP20A, camara: cCam, teltonika: cTel, poe: cPoe },
                        gastosOperacion: [], 
                        operacion: { cfe: 0, internetFibra: 0, internetSatelital: 0, licTeltonika: 0, licTeamViewer: 0, licCMS: 0, licHikvision: 0, licUPS: 0, licQTM: 0, pauta: 0, gasolina: 0, transporte: 0 },
                        mantenimiento: { estetico: 0, profundo: 0, software: 0, tickets: 0 },
                        tickets: []
                    };
                    if (pseudoTicketEstructura) p.tickets.push(pseudoTicketEstructura);
                    this.rawData.push(p);
                }

                if (unidadDefecto === 'VIA VERDE') {
                    if (!p.carasVV) p.carasVV = {};
                    p.carasVV[orientacion] = { costoPantalla: cPantalla, costoAnterior: cAnterior, obraCivil: cObra, costoEstructura: cEst, costoMedidor: cMed, costoInstalacion: cInst, novastar: cNova, ups: cUps, nuc: cNuc, pastillaTri: cPTri, pastilla20A: cP20A, camara: cCam, teltonika: cTel, poe: cPoe };
                }
            };

            if (capexEco) capexEco.forEach(f => procesarFilaCapex(f, 'ECOVALLAS'));
            if (capexVV) capexVV.forEach(f => procesarFilaCapex(f, 'VIA VERDE'));

            const procesarFilaOperacion = (op) => {
                const id = String(getExact(op, ['sitio', 'id', 'ID de pantalla']) || '').trim();
                const pantalla = this.rawData.find(p => p.id === id);
                if (pantalla) {
                    pantalla.gastosOperacion.push({
                        mes: extraerMesFuerte(op),
                        cfe: limpiarDinero(getExact(op, ['CFE'])),
                        internetFibra: limpiarDinero(getExact(op, ['Internet fibra'])),
                        internetSatelital: limpiarDinero(getExact(op, ['Internet redundancia (satelital)', 'Internet redundancia'])),
                        licTeltonika: limpiarDinero(getExact(op, ['Licencia Teltonika'])),
                        licTeamViewer: limpiarDinero(getExact(op, ['Licencia TeamViewer'])),
                        licCMS: limpiarDinero(getExact(op, ['Licencia CMS'])),
                        licHikvision: limpiarDinero(getExact(op, ['Licencia Hikvision'])),
                        licUPS: limpiarDinero(getExact(op, ['Licencia de portal de UPS'])),
                        licQTM: limpiarDinero(getExact(op, ['Licencia QTM'])),
                        pauta: limpiarDinero(getExact(op, ['Pauta'])),
                        gasolina: 0,
                        transporte: 0
                    });
                }
            };

            if (opEco) opEco.forEach(procesarFilaOperacion);
            if (opVV) opVV.forEach(procesarFilaOperacion);

            const procesarFilaTicket = (ticket) => {
                const id = String(getExact(ticket, ['ID de pantalla', 'sitio']) || '').trim();
                const pantallaObj = this.rawData.find(p => p.id === id);
                if (!pantallaObj) return;

                const actividadOriginal = getExact(ticket, ['Actividad', 'incidencia']) || 'Incidencia General';
                const actividad = corregirTexto(actividadOriginal);
                
                let costoTotalExcel = limpiarDinero(getExact(ticket, ['Total', 'costo_acumulado'])); 
                let cGasolina = limpiarDinero(getExact(ticket, ['Costos gasoli', 'Costos gasolina']));
                let cTransporte = limpiarDinero(getExact(ticket, ['Costos transporte']));
                let cInsumo = limpiarDinero(getExact(ticket, ['Costos insumos', 'Costo insumo']));
                let cRefaccion = limpiarDinero(getExact(ticket, ['Costos refacciones', 'Costo refaccion']));

                const mes = extraerMesFuerte(ticket);
                const fechaCruda = getExact(ticket, ['Fecha', 'fecha_creacion', 'fecha']);
                const fechaCorta = formatearFecha(fechaCruda);

                let insumoRaw = getExact(ticket, ['Tipo de insumo', 'Insumo']);
                let refaccionRaw = getExact(ticket, ['Tipo de refacción', 'Refaccion', 'Tipo de refaccion', 'Tipo de refacci\uFFFDn']);
                
                let insumo = corregirTexto(insumoRaw || '');
                let refaccion = corregirTexto(refaccionRaw || '');

                const actFiltro = normalizarFiltro(actividad);
                
                if (cInsumo === 0 && (normalizarFiltro(insumo).includes('franela') || normalizarFiltro(insumo).includes('nala') || normalizarFiltro(insumo).includes('cepillo') || normalizarFiltro(insumo).includes('trapo'))) {
                    if (!actFiltro.includes('estetico') && !actFiltro.includes('graffiti') && !actFiltro.includes('sello') && !actFiltro.includes('limpieza')) {
                        insumo = ''; 
                    }
                }

                let opMes = pantallaObj.gastosOperacion.find(o => o.mes === mes);
                if (!opMes) {
                    opMes = { mes: mes, cfe: 0, internetFibra: 0, internetSatelital: 0, licTeltonika: 0, licTeamViewer: 0, licCMS: 0, licHikvision: 0, licUPS: 0, licQTM: 0, pauta: 0, gasolina: 0, transporte: 0 };
                    pantallaObj.gastosOperacion.push(opMes);
                }
                
                opMes.gasolina += cGasolina;
                opMes.transporte += cTransporte;

                let costoManttoPuro = costoTotalExcel - cGasolina - cTransporte;
                if(costoManttoPuro < 0) costoManttoPuro = 0;

                if (actFiltro.includes('pauta')) {
                    opMes.pauta += costoTotalExcel; 
                } else {
                    pantallaObj.tickets.push({
                        actividad,
                        causa: corregirTexto(getExact(ticket, ['causa_raiz', 'motivo']) || 'Mantenimiento'),
                        fechaCorta: fechaCorta, 
                        mes: mes,
                        insumo: insumo,
                        costoInsumo: cInsumo,
                        refaccion: refaccion,
                        costoRefaccion: cRefaccion,
                        transporte: cTransporte,
                        gasolina: cGasolina,
                        costoManttoOriginal: costoTotalExcel, 
                        costoManttoPuro: costoManttoPuro 
                    });
                }
            };

            if (tkEco) tkEco.forEach(procesarFilaTicket);
            if (tkVV) tkVV.forEach(procesarFilaTicket);

            const ubicacionesDB = [
                { id: "MX_CM_EV_3074", lat: 19.4251659, lng: -99.2218552 },
                { id: "MX_CM_EV_3187", lat: 19.4138316, lng: -99.1873959 },
                { id: "MX_CM_EV_3213", lat: 19.3774107, lng: -99.2597016 },
                { id: "MX_CM_EV_2256", lat: 19.3629188, lng: -99.2737641 },
                { id: "MX_CM_EV_2570", lat: 19.3654888, lng: -99.1837952 },
                { id: "MX_CM_EV_2925", lat: 19.3835327, lng: -99.1398387 },
                { id: "MX_CM_EV_3098", lat: 19.2949494, lng: -99.159233 },
                { id: "MX_CM_EV_2345", lat: 19.3022573, lng: -99.1687954 },
                { id: "MX_CM_EV_2728", lat: 19.3233368, lng: -99.2168358 },
                { id: "MX_CM_EV_2188", lat: 19.3804376, lng: -99.2521139 },
                { id: "MX_CM_EV_2472", lat: 19.3823698, lng: -99.252848 },
                { id: "MX_CM_EV_3147", lat: 19.3959272, lng: -99.1846653 },
                { id: "MX_CM_EV_2094", lat: 19.426757, lng: -99.1938853 },
                { id: "MX_CM_EV_2297", lat: 19.3392293, lng: -99.2189838 },
                { id: "MX_CM_EV_2547", lat: 19.3089148, lng: -99.1325019 },
                { id: "MX_CM_EV_3168", lat: 19.3584135, lng: -99.1950754 },
                { id: "MX_CM_EV_2968", lat: 19.3671284, lng: -99.2574308 },
                { id: "MX_CM_EV_2397", lat: 19.3671104, lng: -99.2583468 },
                { id: "MX_CM_EV_2993", lat: 19.412346, lng: -99.1627985 },
                { id: "MX_CM_EV_2768", lat: 19.429368, lng: -99.1799963 },
                { id: "MX_CM_EV_3161", lat: 19.3788255, lng: -99.2531741 },
                { id: "MX_CM_EV_3133", lat: 19.4017512, lng: -99.170583 },
                { id: "MX_CM_EV_2439", lat: 19.4160791, lng: -99.1676782 },
                { id: "MX_CM_EV_2466", lat: 19.341642, lng: -99.2584712 },
                { id: "MX_CM_EV_2880", lat: 19.3644338, lng: -99.1907508 },
                { id: "MX_CM_EV_2941", lat: 19.4337419, lng: -99.158544 },
                { id: "MX_CM_EV_2958", lat: 19.4256302, lng: -99.2067655 },
                { id: "MX_CM_EV_3139", lat: 19.4293181, lng: -99.1610142 },
                { id: "MX_CM_EV_3229", lat: 19.3188446, lng: -99.1305225 },
                { id: "MX_CM_EV_3261", lat: 19.4109658, lng: -99.1671733 },
                { id: "MX_CM_EV_3323", lat: 19.4127966, lng: -99.1710228 },
                { id: "MX_CM_EV_3379", lat: 19.4033773, lng: -99.1715851 },
                { id: "MX_CM_EV_3381", lat: 19.4040748, lng: -99.1436422 },
                { id: "MX_CM_EV_3434", lat: 19.4287287, lng: -99.1918305 },
                { id: "MX_CM_EV_3490", lat: 19.4241031, lng: -99.1725698 },
                { id: "MX_CM_EV_3510", lat: 19.4308436, lng: -99.1583619 },
                { id: "MX_CM_EV_3519", lat: 19.3788519, lng: -99.1876277 },
                { id: "MX_CM_EV_3559", lat: 19.3050567, lng: -99.2016286 },
                { id: "MX_CM_EV_3579", lat: 19.4268578, lng: -99.1967637 },
                { id: "MX_CM_EV_3591", lat: 19.4351816, lng: -99.1905603 },
                { id: "MX_CM_EV_3596", lat: 19.4132015, lng: -99.1659624 },
                { id: "MX_CM_EV_3605", lat: 19.4362459, lng: -99.1986651 },
                { id: "MX_CM_EV_3612", lat: 19.4624244, lng: -99.1284903 },
                { id: "MX_CM_EV_3626", lat: 19.4355466, lng: -99.1482793 },
                { id: "MX_CM_EV_3638", lat: 19.4607077, lng: -99.1606222 },
                { id: "MX_CM_EV_MGP_3639", lat: 19.4327013, lng: -99.2021208 },
                { id: "MX_CM_EV_3643", lat: 19.4607077, lng: -99.1606222 },
                { id: "MX_CM_EV_3650", lat: 19.4051512, lng: -99.1154178 },
                { id: "MX_CM_EV_3192", lat: 19.3288318, lng: -99.1331631 },
                { id: "MX_CM_EV_3200", lat: 19.4283392, lng: -99.1605861 },
                { id: "MX_CM_EV_3236", lat: 19.4420592, lng: -99.2117967 },
                { id: "MX_CM_EV_3394", lat: 19.4638234, lng: -99.1459796 },
                { id: "MX_CM_EV_3601", lat: 19.277399, lng: -99.1665069 },
                { id: "MX_CM_EV_3641", lat: 19.3614298, lng: -99.1510745 },
                { id: "MX_CM_EV_3225", lat: 19.3371962, lng: -99.1984596 },
                { id: "MX_CM_EV_3350", lat: 19.4023285, lng: -99.161378 },
                { id: "MX_CM_EV_3544", lat: 19.3038129, lng: -99.1788048 },
                { id: "MX_CM_EV_3580", lat: 19.2795067, lng: -99.2123075 },
                { id: "MX_CM_EV_3615", lat: 19.4702092, lng: -99.2230952 },
                { id: "MX_CM_EV_MGP_3640", lat: 23.634501, lng: -102.552784 },
                { id: "MX_CM_EV_2219", lat: 19.4074625, lng: -99.2237246 },
                { id: "MX_CM_EV_3292", lat: 19.4286898, lng: -99.1907669 },
                { id: "MX_CM_EV_3368", lat: 19.3886232, lng: -99.2407732 },
                { id: "MX_CM_EV_3422", lat: 19.2852625, lng: -99.2076856 },
                { id: "MX_CM_EV_3530", lat: 19.3594624, lng: -99.1892793 },
                { id: "MX_CM_EV_3548", lat: 19.4344074, lng: -99.1984354 },
                { id: "MX_CM_EV_3586", lat: 19.4039579, lng: -99.1300709 },
                { id: "MX_CM_EV_2462", lat: 19.44541, lng: -99.1802536 },
                { id: "MX_CM_EV_3184", lat: 19.4169024, lng: -99.1339413 },
                { id: "MX_CM_EV_3280", lat: 19.2815521, lng: -99.1718678 },
                { id: "MX_CM_EV_3429", lat: 19.3666457, lng: -99.168104 },
                { id: "MX_CM_EV_2920", lat: 19.4433848, lng: -99.1951187 },
                { id: "MX_CM_EV_3492", lat: 19.3999406, lng: -99.1803661 },
                { id: "MX_CM_EV_3599", lat: 19.3479742, lng: -99.1916441 },
                { id: "MX_CM_EV_3619", lat: 19.4272907, lng: -99.2067319 },
                { id: "MX_CM_EV_2740", lat: 19.4968732, lng: -99.7232673 },
                { id: "MX_CM_EV_3489", lat: 19.3583735, lng: -99.153032 },
                { id: "MX_CM_EV_3347", lat: 19.4282336, lng: -99.1684848 },
                { id: "MX_CM_EV_3373", lat: 19.4250639, lng: -99.1701361 },
                { id: "MX_CM_EV_3419", lat: 19.3957979, lng: -99.2249073 },
                { id: "MX_CM_EV_3425", lat: 19.3077169, lng: -99.1329131 },
                { id: "MX_CM_EV_3604", lat: 19.3928008, lng: -99.2593618 },
                { id: "MX_CM_EV_3351", lat: 19.3422929, lng: -99.1421882 },
                { id: "MX_CM_EV_3378", lat: 19.4223177, lng: -99.163796 },
                { id: "MX_CM_EV_3606", lat: 19.2837663, lng: -99.1415151 },
                { id: "MX_CM_EV_3420", lat: 19.3893205, lng: -99.1899652 },
                { id: "MX_CM_EV_3535", lat: 19.4251056, lng: -99.1441471 },
                { id: "MX_CM_EV_3576", lat: 19.3887207, lng: -99.1395619 },
                { id: "MX_CM_EV_3346", lat: 19.4245228, lng: -99.1717462 },
                { id: "MX_CM_EV_3097", lat: 19.4713851, lng: -99.1899351 },
                { id: "MX_CM_EV_3166", lat: 19.3751103, lng: -99.1777208 },
                { id: "MX_CM_EV_2985", lat: 19.3593289, lng: -99.1725783 },
                { id: "MX_CM_EV_2684", lat: 19.3014332, lng: -99.1901718 },
                { id: "MX_CM_EV_2825", lat: 19.3369766, lng: -99.1486269 },
                { id: "MX_CM_VV_COL_414", lat: 19.3329494, lng: -99.2091707 },
                { id: "MX_CM_VV_COL_419", lat: 19.3338878, lng: -99.2085344 },
                { id: "MX_CM_VV_COL_440", lat: 19.3404801, lng: -99.2029093 },
                { id: "MX_CM_VV_COL_444", lat: 19.3374072, lng: -99.2050048 },
                { id: "MX_CM_VV_COL_448", lat: 19.3514198, lng: -99.2013926 },
                { id: "MX_CM_VV_COL_459", lat: 19.3417761, lng: -99.2024505 },
                { id: "MX_CM_VV_COL_465", lat: 19.3428011, lng: -99.2024803 },
                { id: "MX_CM_VV_COL_478", lat: 19.3461992, lng: -99.201782 },
                { id: "MX_CM_VV_COL_491", lat: 19.3493294, lng: -99.201529 },
                { id: "MX_CM_VV_COL_505", lat: 19.3539985, lng: -99.1999331 },
                { id: "MX_CM_VV_COL_509", lat: 19.3542994, lng: -99.1995093 },
                { id: "MX_CM_VV_COL_519", lat: 19.3561576, lng: -99.198167 },
                { id: "MX_CM_VV_COL_529", lat: 19.357061, lng: -99.1958722 },
                { id: "MX_CM_VV_COL_542", lat: 19.3590512, lng: -99.1929337 },
                { id: "MX_CM_VV_COL_551", lat: 19.3563749, lng: -99.1980728 },
                { id: "MX_CM_VV_COL_571", lat: 19.367525, lng: -99.1907384 },
                { id: "MX_CM_VV_COL_576", lat: 19.367525, lng: -99.1907384 },
                { id: "MX_CM_VV_COL_588", lat: 19.3705806, lng: -99.191401 },
                { id: "MX_CM_VV_COL_594", lat: 19.3720199, lng: -99.1912285 },
                { id: "MX_CM_VV_COL_606", lat: 19.3750404, lng: -99.1916546 },
                { id: "MX_CM_VV_COL_620", lat: 19.3782135, lng: -99.1912693 },
                { id: "MX_CM_VV_COL_628", lat: 19.3795755, lng: -99.1912031 },
                { id: "MX_CM_VV_COL_639", lat: 19.3818383, lng: -99.1920764 },
                { id: "MX_CM_VV_COL_641", lat: 19.3878532, lng: -99.1903084 },
                { id: "MX_CM_VV_COL_651", lat: 19.3911142, lng: -99.1892262 },
                { id: "MX_CM_VV_COL_656", lat: 19.3911142, lng: -99.1892262 },
                { id: "MX_CM_VV_COL_661", lat: 19.3820577, lng: -99.1919187 },
                { id: "MX_CM_VV_COL_665", lat: 19.3881972, lng: -99.1895081 },
                { id: "MX_CM_VV_COL_669", lat: 19.3820577, lng: -99.1919187 },
                { id: "MX_CM_VV_COL_679", lat: 19.3769716, lng: -99.192005 },
                { id: "MX_CM_VV_COL_689", lat: 19.3757155, lng: -99.1923347 },
                { id: "MX_CM_VV_COL_706", lat: 19.3738173, lng: -99.1924369 },
                { id: "MX_CM_VV_COL_715", lat: 19.3757155, lng: -99.1923347 },
                { id: "MX_CM_VV_COL_735", lat: 19.3692165, lng: -99.1920368 },
                { id: "MX_CM_VV_COL_748", lat: 19.3655268, lng: -99.1911672 },
                { id: "MX_CM_VV_COL_756", lat: 19.3635229, lng: -99.1914305 },
                { id: "MX_CM_VV_COL_767", lat: 19.3609712, lng: -99.1922848 },
                { id: "MX_CM_VV_COL_778", lat: 19.3588234, lng: -99.1947076 },
                { id: "MX_CM_VV_COL_791", lat: 19.3573922, lng: -99.1974754 },
                { id: "MX_CM_VV_COL_802", lat: 19.3544598, lng: -99.2002472 },
                { id: "MX_CM_VV_COL_811", lat: 19.3528761, lng: -99.200884 },
                { id: "MX_CM_VV_COL_820", lat: 19.3507056, lng: -99.2013222 },
                { id: "MX_CM_VV_COL_829", lat: 19.348586, lng: -99.2019118 },
                { id: "MX_CM_VV_COL_840", lat: 19.3459028, lng: -99.2027233 },
                { id: "MX_CM_VV_COL_856", lat: 19.3429884, lng: -99.2030812 },
                { id: "MX_CM_VV_COL_863", lat: 19.3399327, lng: -99.2035969 },
                { id: "MX_CM_VV_COL_867", lat: 19.339015, lng: -99.204068 },
                { id: "MX_CM_VV_COL_877", lat: 19.3374372, lng: -99.2057098 },
                { id: "MX_CM_VV_COL_881", lat: 19.3366594, lng: -99.2065328 },
                { id: "MX_CM_VV_COL_897", lat: 19.3423781, lng: -99.202512 },
                { id: "MX_CM_VV_POR_0008", lat: 19.3881391, lng: -99.1896744 },
                { id: "MX_CM_VV_POR_0015", lat: 19.3890537, lng: -99.1897654 },
                { id: "MX_CM_VV_POR_0078", lat: 19.3615975, lng: -99.1918463 },
                { id: "MX_CM_VV_POR_0092", lat: 19.3585434, lng: -99.1938248 },
                { id: "MX_CM_BB_MED_0001", lat: 19.4015013, lng: -99.1707968 },
                { id: "MX_CM_BB_MED_0002", lat: 19.3843894, lng: -99.1505862 },
                { id: "MX_CM_BB_MED_0005", lat: 19.375941, lng: -99.1683736 },
                { id: "MX_CM_BB_MED_0006", lat: 19.4326849, lng: -99.2075773 },
                { id: "MX_CM_BB_MED_0010", lat: 19.4055972, lng: -99.1770562 },
                { id: "MX_CM_BB_MED_0011", lat: 19.3725327, lng: -99.1733767 },
                { id: "MX_CM_BB_MED_0012", lat: 19.429479, lng: -99.19734 },
                { id: "MX_CM_BB_MED_0013", lat: 19.3840902, lng: -99.1815586 },
                { id: "MX_CM_BB_MED_0020", lat: 19.4212406, lng: -99.1541077 },
                { id: "MX_CM_BB_MED_0021", lat: 19.3726802, lng: -99.1807196 },
                { id: "MX_CM_BB_MED_0022", lat: 19.4194717, lng: -99.2132954 },
                { id: "MX_CM_BB_MED_0023", lat: 19.3176085, lng: -99.2102814 },
                { id: "MX_CM_BB_MED_0024", lat: 19.4517397, lng: -99.1346979 },
                { id: "MX_CM_BB_MED_0027", lat: 19.4128416, lng: -99.1707446 },
                { id: "MX_CM_BB_MED_0028", lat: 19.4166573, lng: -99.1674082 },
                { id: "MX_CM_BB_MED_0031", lat: 19.3193005, lng: -99.1212825 },
                { id: "MX_CM_BB_MED_0032", lat: 19.3442359, lng: -99.1705294 },
                { id: "MX_CM_BB_MEC_0009", lat: 19.4127688, lng: -99.1605683 },
                { id: "MX_CM_BB_MED_0034", lat: 19.4311031, lng: -99.1821451 },
                { id: "MX_CM_BB_MED_0035", lat: 19.4228639, lng: -99.1671684 },
                { id: "MX_CM_BB_MED_0036", lat: 19.4143805, lng: -99.1707241 },
                { id: "MX_CM_BB_MED_0040", lat: 19.4406926, lng: -99.2047001 },
                { id: "MX_CM_BB_MED_0041", lat: 19.39474, lng: -99.2103 },
                { id: "MX_CM_BB_MED_0044", lat: 19.3792867, lng: -99.1690816 },
                { id: "MX_CM_BB_MED_0045", lat: 19.4382105, lng: -99.2108693 },
                { id: "MX_CM_BB_MED_0046", lat: 19.4561848, lng: -99.2333006 },
                { id: "MX_CM_BB_MED_0047", lat: 19.4326266, lng: -99.2064702 },
                { id: "MX_CM_BB_MED_0049", lat: 19.4286791, lng: -99.1814392 },
                { id: "MX_CM_BB_MED_0050", lat: 19.4131388, lng: -99.1715168 },
                { id: "MX_CM_BB_MED_0051", lat: 19.3851966, lng: -99.1808497 },
                { id: "MX_CM_BB_MED_0052", lat: 19.4155955, lng: -99.1654734 },
                { id: "MX_CM_BB_MED_0054", lat: 19.4315167, lng: -99.18107 },
                { id: "MX_CM_BB_MED_0055", lat: 19.386118, lng: -99.1748776 },
                { id: "MX_CM_BB_MED_0056", lat: 19.4315866, lng: -99.1817049 },
                { id: "MX_CM_BB_MED_0057", lat: 19.363288, lng: -99.1737737 },
                { id: "MX_CM_BB_MED_0059", lat: 19.3992835, lng: -99.1628717 },
                { id: "MX_CM_BB_MED_0063", lat: 19.4191261, lng: -99.1600164 },
                { id: "MX_CM_BB_MED_0064", lat: 19.406519, lng: -99.1567954 },
                { id: "MX_CM_BB_MED_0065", lat: 19.4215799, lng: -99.1715612 },
                { id: "MX_CM_BB_MED_0066", lat: 19.4775672, lng: -99.2311379 },
                { id: "MX_CM_BB_MED_0067", lat: 19.40665, lng: -99.15487 },
                { id: "MX_CM_BB_MED_0069", lat: 19.4120187, lng: -99.1723774 },
                { id: "MX_CM_BB_MED_0070", lat: 19.3848454, lng: -99.1557777 },
                { id: "MX_CM_BB_MED_0071", lat: 19.3878382, lng: -99.1538586 },
                { id: "MX_CM_BB_MED_0072", lat: 19.4354327, lng: -99.1908988 },
                { id: "MX_CM_BB_MED_0074", lat: 19.4318449, lng: -99.2150787 },
                { id: "MX_CM_BB_MED_0075", lat: 19.40656, lng: -99.15519 },
                { id: "MX_CM_BB_MED_0077", lat: 19.3398779, lng: -99.1479651 },
                { id: "MX_CM_BB_MED_0079", lat: 19.4384569, lng: -99.2059141 },
                { id: "MX_CM_BB_MED_0080", lat: 19.4116986, lng: -99.171463 },
                { id: "MX_CM_BB_MED_0081", lat: 19.4010727, lng: -99.1556142 },
                { id: "MX_CM_BB_MED_0082", lat: 19.3467839, lng: -99.1877501 },
                { id: "MX_CM_BB_MED_0083", lat: 19.4227274, lng: -99.1608991 },
                { id: "MX_CM_BB_MED_0084", lat: 19.3461527, lng: -99.1900322 },
                { id: "MX_CM_BB_MED_0087", lat: 19.3474681, lng: -99.1873908 },
                { id: "MX_CM_BB_MED_0088", lat: 19.3410949, lng: -99.1375129 }
            ];

            this.rawData.forEach(pantalla => {
                const idCSV = String(pantalla.id).trim().toLowerCase();

                const match = ubicacionesDB.find(ub => {
                    const idDB = String(ub.id).trim().toLowerCase();
                    if (idCSV === idDB) return true;
                    
                    const numCSV = idCSV.match(/\d+$/);
                    const numDB = idDB.match(/\d+$/);
                    
                    if (numCSV && numDB && numCSV[0] === numDB[0]) {
                        if (pantalla.unidad === 'ECOVALLAS' && idDB.includes('ev_')) return true;
                        if (pantalla.unidad === 'VIA VERDE' && idDB.includes('vv_')) return true;
                        if (pantalla.unidad === 'BIOBOX' && idDB.includes('bb_')) return true;
                    }
                    return false;
                });
                
                if (match && match.lat && match.lng) {
                    pantalla.lat = match.lat;
                    pantalla.lng = match.lng;
                }
            });

            console.log("¡Base de datos cargada y Coordenadas sincronizadas con éxito!", this.rawData);

        } catch (error) {
            console.error("Error al cargar datos:", error);
        }
    }

    getPantallasPorUnidad(unidad) {
        const target = normalizarFiltro(unidad).replace(/\s/g, '');
        return this.rawData.filter(p => normalizarFiltro(p.unidad).replace(/\s/g, '') === target);
    }

    getSumasConsolidadas(unidad, modulo, mes = 'all') {
        const pantallas = this.getPantallasPorUnidad(unidad);
        const etiquetas = this.diccionarios[modulo];
        const mesBuscado = mes.toLowerCase().replace(/[^a-z0-9]/g, ''); 
        let sumas = {};

        if (modulo === 'mantenimiento') {
            sumas = { estetico: 0, profundo: 0, software: 0, tickets: 0 };
        } else {
            Object.keys(etiquetas).forEach(k => sumas[k] = 0);
        }
        
        pantallas.forEach(p => {
            Object.keys(sumas).forEach(k => { 
                if (modulo === 'operacion') {
                    const registrosMes = p.gastosOperacion.filter(o => mesBuscado === 'all' || o.mes === mesBuscado);
                    sumas[k] += registrosMes.reduce((acc, o) => acc + (o[k] || 0), 0);
                    
                } else if (modulo === 'mantenimiento') {
                    const ticketsMes = p.tickets.filter(tk => mesBuscado === 'all' || tk.mes === mesBuscado);
                    const filtrarPorKeyword = (key) => ticketsMes.filter(tk => normalizarFiltro(tk.actividad).includes(key)).reduce((acc, tk) => acc + tk.costoManttoOriginal, 0);

                    if (k === 'estetico') sumas[k] += filtrarPorKeyword('estetico');
                    else if (k === 'software') sumas[k] += filtrarPorKeyword('software');
                    else if (k === 'profundo') sumas[k] += filtrarPorKeyword('profundo');
                    else if (k === 'tickets') {
                        sumas[k] += ticketsMes.filter(tk => {
                            const n = normalizarFiltro(tk.actividad);
                            return !n.includes('estetico') && !n.includes('software') && !n.includes('profundo');
                        }).reduce((acc, tk) => acc + tk.costoManttoOriginal, 0);
                    }
                } else {
                    sumas[k] += (p[modulo][k] || 0); 
                }
            });
        });
        return sumas;
    }

    getGranTotal(sumasObj) {
        return Object.values(sumasObj).reduce((a, b) => a + b, 0);
    }
}