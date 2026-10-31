// Configuración de tu proyecto de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDy1bb0WVL9_HYg59TuA0dIi1d4ekVIa0E",
    authDomain: "registro-de-salidas-884cf.firebaseapp.com",
    projectId: "registro-de-salidas-884cf",
    storageBucket: "registro-de-salidas-884cf.firebasestorage.app",
    messagingSenderId: "922399897406",
    appId: "1:922399897406:web:84c442683526839a4c5e6f",
    measurementId: "G-Y5HZCX7FRT"
};

// Inicializar Firebase y Firestore
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const salidasRef = db.collection('salidas');
const configRef = db.collection('config').doc('sistema'); // Referencia para guardar la contraseña en Firestore

// Elementos DOM
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const formLogin = document.getElementById('form-login');
const inputPassword = document.getElementById('input-password');
const btnLogout = document.getElementById('btn-logout');
const adminControls = document.getElementById('admin-controls');

const formSalida = document.getElementById('form-salida');
const listaHistorial = document.getElementById('lista-historial');
const bodyTotales = document.getElementById('body-totales');
const userDisplay = document.getElementById('user-display');

// Función aux para formatear moneda COP
const formatoMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
};

// Comprobar si ya está autenticado en esta sesión del navegador
let sesionActiva = sessionStorage.getItem('sesion_autorizada');
let usuarioActual = localStorage.getItem('usuario_salidas');
let rolActual = localStorage.getItem('rol_salidas');

if (sesionActiva === 'true' && usuarioActual && rolActual) {
    mostrarAplicacion();
}

// 1. Manejar el inicio de sesión con contraseña desde Firestore
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordIngresada = inputPassword.value.trim();

    try {
        // Consultar la contraseña actual en Firebase
        const docSnap = await configRef.get();
        let passwordReal = "1234"; // Contraseña por defecto si aún no se ha creado el documento

        if (docSnap.exists && docSnap.data().password) {
            passwordReal = docSnap.data().password;
        } else {
            // Si no existe en la base de datos, la inicializamos con "1234"
            await configRef.set({ password: "1234" }, { merge: true });
        }

        if (passwordIngresada !== passwordReal) {
            alert("Contraseña incorrecta. Intenta nuevamente.");
            inputPassword.value = '';
            return;
        }

        // Si la contraseña es correcta, pedir nombre y rol si no están guardados
        if (!usuarioActual || !rolActual) {
            while (!usuarioActual || usuarioActual.trim() === '') {
                usuarioActual = prompt('Ingresa tu nombre para continuar:');
            }
            usuarioActual = usuarioActual.trim();
            
            let eleccionRol = prompt('Selecciona tu rol:\n1. Operador\n2. Administrador', '1');
            rolActual = (eleccionRol === '2') ? 'Administrador' : 'Operador';

            localStorage.setItem('usuario_salidas', usuarioActual);
            localStorage.setItem('rol_salidas', rolActual);
        }

        sessionStorage.setItem('sesion_autorizada', 'true');
        inputPassword.value = '';
        mostrarAplicacion();

    } catch (error) {
        console.error("Error al verificar la contraseña:", error);
        alert("Ocurrió un error al conectar con el servidor.");
    }
});

function mostrarAplicacion() {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'block';
    userDisplay.textContent = `${usuarioActual} (${rolActual})`;

    // Si es Administrador, agregamos el botón de cambiar contraseña en pantalla
    adminControls.innerHTML = '';
    if (rolActual === 'Administrador') {
        const btnCambiarPass = document.createElement('button');
        btnCambiarPass.textContent = '🔑 Cambiar Contraseña';
        btnCambiarPass.style.cssText = 'background:#3b82f6; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px;';
        btnCambiarPass.onclick = cambiarContrasenaSistema;
        adminControls.appendChild(btnCambiarPass);
    }
}

// Función exclusiva para Administradores para cambiar la clave en Firestore
window.cambiarContrasenaSistema = async function() {
    if (rolActual !== 'Administrador') {
        alert("No tienes permisos para realizar esta acción.");
        return;
    }

    const nuevaPassword = prompt("Ingresa la nueva contraseña para el sistema:");
    if (!nuevaPassword || nuevaPassword.trim() === "") return;

    if (confirm(`¿Estás seguro de cambiar la contraseña de acceso a: "${nuevaPassword.trim()}"?`)) {
        try {
            await configRef.set({ password: nuevaPassword.trim() }, { merge: true });
            alert("¡Contraseña actualizada con éxito! Ahora se requerirá esta nueva clave en todos los dispositivos.");
        } catch (error) {
            console.error("Error al actualizar la contraseña: ", error);
            alert("No se pudo actualizar la contraseña en el servidor.");
        }
    }
};

// Botón de cerrar sesión
btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('sesion_autorizada');
    mainApp.style.display = 'none';
    loginScreen.style.display = 'block';
    inputPassword.value = '';
});

// 2. Registrar nueva salida
formSalida.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productoInput = document.getElementById('producto-nombre');
    const cantidadInput = document.getElementById('cantidad-salida');
    const precioInput = document.getElementById('precio-salida');

    const producto = productoInput.value.trim();
    const cantidad = parseInt(cantidadInput.value, 10);
    const precio = parseFloat(precioInput.value);

    if (!producto || isNaN(cantidad) || cantidad <= 0 || isNaN(precio) || precio < 0) {
        alert("Por favor completa los campos correctamente.");
        return;
    }

    try {
        await salidasRef.add({
            producto: producto,
            cantidad: cantidad,
            precioUnitario: precio,
            totalPrecio: cantidad * precio,
            usuario: usuarioActual,
            rol: rolActual,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });

        formSalida.reset();
        cantidadInput.value = "1";
    } catch (error) {
        console.error("Error al registrar la salida: ", error);
        alert("Ocurrió un error al guardar el registro: " + error.message);
    }
});

// Función global para que los administradores eliminen registros
window.eliminarRegistro = async function(id) {
    if (rolActual !== 'Administrador') {
        alert("No tienes permisos de Administrador para eliminar registros.");
        return;
    }

    if (confirm("¿Estás seguro de que deseas eliminar este registro del historial?")) {
        try {
            await salidasRef.doc(id).delete();
        } catch (error) {
            console.error("Error al eliminar: ", error);
            alert("No se pudo eliminar el registro.");
        }
    }
};

// 3. Escuchar e imprimir Historial y Tabla de Totales del Día en Tiempo Real
salidasRef.orderBy('fecha', 'desc').onSnapshot((snapshot) => {
    listaHistorial.innerHTML = '';
    
    if (snapshot.empty) {
        listaHistorial.innerHTML = '<li style="text-align:center; color:#64748b; padding: 10px;">No hay registros de salidas aún.</li>';
        bodyTotales.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 10px; color: #64748b;">No hay salidas registradas hoy.</td></tr>';
        return;
    }

    const hoyStr = new Date().toDateString();
    const totalesHoy = {};

    snapshot.forEach((doc) => {
        const item = doc.data();
        const docId = doc.id;
        
        let fechaFormateada = 'Procesando...';
        let esDeHoy = false;

        if (item.fecha) {
            const dateObj = item.fecha.toDate();
            fechaFormateada = dateObj.toLocaleString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            if (dateObj.toDateString() === hoyStr) {
                esDeHoy = true;
            }
        }

        const precioUnitario = item.precioUnitario || 0;
        const totalFila = item.totalPrecio || (item.cantidad * precioUnitario);

        if (esDeHoy && item.producto) {
            const claveProd = item.producto.trim();
            if (!totalesHoy[claveProd]) {
                totalesHoy[claveProd] = { cantidad: 0, dinero: 0 };
            }
            totalesHoy[claveProd].cantidad += (item.cantidad || 0);
            totalesHoy[claveProd].dinero += totalFila;
        }

        let botonEliminar = '';
        if (rolActual === 'Administrador') {
            botonEliminar = `<button onclick="eliminarRegistro('${docId}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; margin-top:5px;">🗑️ Eliminar</button>`;
        }

        const li = document.createElement('li');
        li.className = 'item-row';
        li.innerHTML = `
            <div>
                <span class="item-name">${item.producto}</span>
                <br><small style="color:#64748b;">Retirado por: <strong>${item.usuario}</strong> (${item.rol || 'Operador'})</small>
                <br><small style="color:#64748b;">Precio c/u: ${formatoMoneda(precioUnitario)}</small>
                <br><small style="color:#94a3b8;">${fechaFormateada}</small>
                ${botonEliminar ? '<br>' + botonEliminar : ''}
            </div>
            <div style="text-align: right;">
                <span class="stock-badge">-${item.cantidad} u.</span>
                <br><strong style="color: #0f172a; font-size: 13px;">${formatoMoneda(totalFila)}</strong>
            </div>
        `;
        listaHistorial.appendChild(li);
    });

    bodyTotales.innerHTML = '';
    const productosHoy = Object.keys(totalesHoy);

    if (productosHoy.length === 0) {
        bodyTotales.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 10px; color: #64748b;">No hay salidas registradas hoy.</td></tr>';
    } else {
        let granTotalDinero = 0;

        productosHoy.forEach((prod) => {
            const datos = totalesHoy[prod];
            granTotalDinero += datos.dinero;

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';
            tr.innerHTML = `
                <td style="padding: 8px; font-weight: 600;">${prod}</td>
                <td style="padding: 8px; text-align: center; color: #ef4444; font-weight: bold;">-${datos.cantidad} u.</td>
                <td style="padding: 8px; text-align: right; font-weight: bold; color: #0f172a;">${formatoMoneda(datos.dinero)}</td>
            `;
            bodyTotales.appendChild(tr);
        });

        const trTotal = document.createElement('tr');
        trTotal.style.background = '#f8fafc';
        trTotal.style.fontWeight = 'bold';
        trTotal.innerHTML = `
            <td colspan="2" style="padding: 10px; text-align: right; color: #334155;">TOTAL DEL DÍA:</td>
            <td style="padding: 10px; text-align: right; color: #16a34a; font-size: 15px;">${formatoMoneda(granTotalDinero)}</td>
        `;
        bodyTotales.appendChild(trTotal);
    }

}, (error) => {
    console.error("Error al obtener historial: ", error);
    listaHistorial.innerHTML = `<li style="color:red; text-align:center; padding: 10px;">Error al cargar historial: ${error.message}</li>`;
});