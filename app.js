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
const usuariosRef = db.collection('usuarios'); // Colección para guardar cuentas de usuario independientes

// Elementos DOM
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const formLogin = document.getElementById('form-login');
const inputUsuario = document.getElementById('input-usuario');
const inputPassword = document.getElementById('input-password');
const btnLogout = document.getElementById('btn-logout');
const btnCambiarPass = document.getElementById('btn-cambiar-pass');

const formSalida = document.getElementById('form-salida');
const listaHistorial = document.getElementById('lista-historial');
const bodyTotales = document.getElementById('body-totales');
const userDisplay = document.getElementById('user-display');

// Función aux para formatear moneda COP
const formatoMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
};

// Comprobar sesión activa previa en el navegador
let sesionActiva = sessionStorage.getItem('sesion_autorizada');
let usuarioActual = localStorage.getItem('usuario_salidas');
let rolActual = localStorage.getItem('rol_salidas');

if (sesionActiva === 'true' && usuarioActual && rolActual) {
    mostrarAplicacion();
}

// 1. Manejo de Inicio de Sesión o Auto-registro de Usuario
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombreIngresado = inputUsuario.value.trim();
    const passwordIngresada = inputPassword.value.trim();

    if (!nombreIngresado || !passwordIngresada) return;

    // Normalizar nombre de usuario para buscarlo como ID (minúsculas y sin espacios extra)
    const userId = nombreIngresado.toLowerCase().replace(/\s+/g, '_');

    try {
        const userDocRef = usuariosRef.doc(userId);
        const docSnap = await userDocRef.get();

        if (docSnap.exists) {
            // El usuario ya existe, verificar contraseña
            const datosUsuario = docSnap.data();
            if (datosUsuario.password !== passwordIngresada) {
                alert("Contraseña incorrecta para este usuario.");
                inputPassword.value = '';
                return;
            }
            usuarioActual = datosUsuario.nombre;
            rolActual = datosUsuario.rol;
        } else {
            // El usuario no existe, crearlo automáticamente de forma amigable
            if (confirm(`El usuario "${nombreIngresado}" no está registrado. ¿Deseas crearlo ahora?`)) {
                let eleccionRol = prompt('Selecciona el rol para este nuevo usuario:\n1. Operador\n2. Administrador', '1');
                let nuevoRol = (eleccionRol === '2') ? 'Administrador' : 'Operador';

                await userDocRef.set({
                    nombre: nombreIngresado,
                    password: passwordIngresada,
                    rol: nuevoRol,
                    creado: firebase.firestore.FieldValue.serverTimestamp()
                });

                usuarioActual = nombreIngresado;
                rolActual = nuevoRol;
                alert(`¡Usuario "${usuarioActual}" creado exitosamente como ${rolActual}!`);
            } else {
                return;
            }
        }

        // Guardar en sesión local del navegador
        localStorage.setItem('usuario_salidas', usuarioActual);
        localStorage.setItem('rol_salidas', rolActual);
        sessionStorage.setItem('sesion_autorizada', 'true');

        inputUsuario.value = '';
        inputPassword.value = '';
        mostrarAplicacion();

    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        alert("Ocurrió un error al conectar con el servidor.");
    }
});

function mostrarAplicacion() {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'block';
    userDisplay.textContent = `${usuarioActual} (${rolActual})`;
}

// Botón para que cualquier usuario cambie su propia contraseña
btnCambiarPass.addEventListener('click', async () => {
    const nuevaPassword = prompt("Ingresa tu nueva contraseña personal:");
    if (!nuevaPassword || nuevaPassword.trim() === "") return;

    const userId = usuarioActual.toLowerCase().replace(/\s+/g, '_');

    if (confirm(`¿Estás seguro de actualizar tu contraseña, ${usuarioActual}?`)) {
        try {
            await usuariosRef.doc(userId).update({ password: nuevaPassword.trim() });
            alert("¡Contraseña actualizada con éxito!");
        } catch (error) {
            console.error("Error al actualizar contraseña:", error);
            alert("No se pudo actualizar la contraseña.");
        }
    }
});

// Botón de cerrar sesión
btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('sesion_autorizada');
    mainApp.style.display = 'none';
    loginScreen.style.display = 'block';
    inputUsuario.value = '';
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