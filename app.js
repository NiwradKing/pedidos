const firebaseConfig = {
    apiKey: "AIzaSyDy1bb0WVL9_HYg59TuA0dIi1d4ekVIa0E",
    authDomain: "registro-de-salidas-884cf.firebaseapp.com",
    projectId: "registro-de-salidas-884cf",
    storageBucket: "registro-de-salidas-884cf.firebasestorage.app",
    messagingSenderId: "922399897406",
    appId: "1:922399897406:web:84c442683526839a4c5e6f",
    measurementId: "G-Y5HZCX7FRT"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const salidasRef = db.collection('salidas');
const usuariosRef = db.collection('usuarios');

const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const menuAdminUsuarios = document.getElementById('menu-admin-usuarios');
const formLogin = document.getElementById('form-login');
const formCrearUsuario = document.getElementById('form-crear-usuario');

const inputUsuario = document.getElementById('input-usuario');
const inputPassword = document.getElementById('input-password');
const btnLogout = document.getElementById('btn-logout');
const btnCambiarPass = document.getElementById('btn-cambiar-pass');

const formSalida = document.getElementById('form-salida');
const listaHistorialHoy = document.getElementById('lista-historial-hoy');
const listaHistorialGeneral = document.getElementById('lista-historial-general');
const bodyTotales = document.getElementById('body-totales');
const bodyUsuariosLista = document.getElementById('body-usuarios-lista');
const userDisplay = document.getElementById('user-display');

let cacheSalidas = [];

// Función para abrir/cerrar el menú desplegable (hamburguesa) en celulares y PC
window.toggleMenu = function() {
    const menu = document.getElementById('dropdown-menu');
    menu.classList.toggle('show');
};

// Control de Secciones y cierre automático del menú desplegable
window.cambiarSeccion = function(seccion) {
    const secSalidas = document.getElementById('seccion-salidas');
    const secHistorial = document.getElementById('seccion-historial');
    const secUsuarios = document.getElementById('seccion-usuarios');
    const botonesNav = document.querySelectorAll('.dropdown-menu .nav-item');

    botonesNav.forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    secSalidas.style.display = 'none';
    secHistorial.style.display = 'none';
    secUsuarios.style.display = 'none';

    if (seccion === 'salidas') {
        secSalidas.style.display = 'block';
    } else if (seccion === 'historial') {
        secHistorial.style.display = 'block';
        renderizarHistorialGeneral(cacheSalidas);
    } else if (seccion === 'usuarios' && rolActual === 'Administrador') {
        secUsuarios.style.display = 'block';
        cargarListaUsuarios();
    }

    // Ocultar el menú desplegable después de seleccionar una opción
    const menu = document.getElementById('dropdown-menu');
    if (menu) menu.classList.remove('show');
};

let sesionActiva = sessionStorage.getItem('sesion_autorizada');
let usuarioActual = localStorage.getItem('usuario_salidas');
let rolActual = localStorage.getItem('rol_salidas');

if (sesionActiva === 'true' && usuarioActual && rolActual) {
    mostrarAplicacion();
}

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombreIngresado = inputUsuario.value.trim();
    const passwordIngresada = inputPassword.value.trim();
    if (!nombreIngresado || !passwordIngresada) return;

    const userId = nombreIngresado.toLowerCase();
    try {
        const userDocRef = usuariosRef.doc(userId);
        const docSnap = await userDocRef.get();

        if (docSnap.exists) {
            const datosUsuario = docSnap.data();
            if (datosUsuario.password !== passwordIngresada) {
                alert("Contraseña incorrecta.");
                inputPassword.value = '';
                return;
            }
            usuarioActual = datosUsuario.nombre;
            rolActual = datosUsuario.rol;
        } else {
            const snapshotUsuarios = await usuariosRef.get();
            if (snapshotUsuarios.empty && userId === 'admin' && passwordIngresada === 'admin123') {
                await userDocRef.set({
                    nombre: 'Admin',
                    password: 'admin123',
                    rol: 'Administrador',
                    creado: firebase.firestore.FieldValue.serverTimestamp()
                });
                usuarioActual = 'Admin';
                rolActual = 'Administrador';
                alert("¡Cuenta de Administrador inicial configurada exitosamente!");
            } else {
                alert("Usuario no registrado. Solicita tu acceso al Administrador.");
                return;
            }
        }

        localStorage.setItem('usuario_salidas', usuarioActual);
        localStorage.setItem('rol_salidas', rolActual);
        sessionStorage.setItem('sesion_autorizada', 'true');
        inputUsuario.value = '';
        inputPassword.value = '';
        mostrarAplicacion();
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        alert("Error al conectar con la base de datos.");
    }
});

function mostrarAplicacion() {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'flex';
    userDisplay.textContent = `${usuarioActual} (${rolActual})`;
    if (rolActual === 'Administrador') {
        menuAdminUsuarios.style.display = 'block';
    } else {
        menuAdminUsuarios.style.display = 'none';
    }
}

if (formCrearUsuario) {
    formCrearUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (rolActual !== 'Administrador') return;
        const nombreNuevo = document.getElementById('nuevo-user-nombre').value.trim();
        const passNueva = document.getElementById('nuevo-user-pass').value.trim();
        if (!nombreNuevo || !passNueva) return;

        const nuevoUserId = nombreNuevo.toLowerCase().replace(/\s+/g, '_');
        try {
            const userDocRef = usuariosRef.doc(nuevoUserId);
            const docSnap = await userDocRef.get();
            if (docSnap.exists) {
                alert(`El usuario "${nombreNuevo}" ya existe.`);
                return;
            }
            await userDocRef.set({
                nombre: nombreNuevo,
                password: passNueva,
                rol: 'Operador',
                creado: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert(`¡Operador "${nombreNuevo}" creado con éxito!`);
            formCrearUsuario.reset();
            cargarListaUsuarios();
        } catch (error) {
            alert("No se pudo registrar el usuario.");
        }
    });
}

async function cargarListaUsuarios() {
    if (rolActual !== 'Administrador') return;
    try {
        const snapshot = await usuariosRef.get();
        bodyUsuariosLista.innerHTML = '';
        if (snapshot.empty) {
            bodyUsuariosLista.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #64748b;">No hay usuarios.</td></tr>';
            return;
        }
        snapshot.forEach((doc) => {
            const usr = doc.data();
            const docId = doc.id;
            let botonAccion = '<span style="color: #94a3b8; font-size: 12px;">Principal</span>';
            if (usr.rol !== 'Administrador') {
                botonAccion = `<button onclick="eliminarUsuario('${docId}', '${usr.nombre}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;">🗑️ Eliminar</button>`;
            }
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight: 600;">${usr.nombre}</td>
                <td style="padding: 10px; color: ${usr.rol === 'Administrador' ? '#2563eb' : '#475569'};">${usr.rol}</td>
                <td style="padding: 10px; text-align: right;">${botonAccion}</td>
            `;
            bodyUsuariosLista.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
    }
}

window.eliminarUsuario = async function(id, nombre) {
    if (confirm(`¿Estás seguro de eliminar al operador "${nombre}"?`)) {
        try {
            await usuariosRef.doc(id).delete();
            cargarListaUsuarios();
        } catch (error) {
            alert("No se pudo eliminar.");
        }
    }
};

btnCambiarPass.addEventListener('click', async () => {
    const nuevaPassword = prompt("Ingresa tu nueva contraseña:");
    if (!nuevaPassword || nuevaPassword.trim() === "") return;
    const userId = usuarioActual.toLowerCase().replace(/\s+/g, '_');
    if (confirm(`¿Confirmas actualizar tu contraseña?`)) {
        try {
            await usuariosRef.doc(userId).update({ password: nuevaPassword.trim() });
            alert("¡Contraseña actualizada con éxito!");
        } catch (error) {
            alert("No se pudo actualizar.");
        }
    }
});

btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('sesion_autorizada');
    mainApp.style.display = 'none';
    loginScreen.style.display = 'flex';
    inputUsuario.value = '';
    inputPassword.value = '';
});

formSalida.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productoInput = document.getElementById('producto-nombre');
    const cantidadInput = document.getElementById('cantidad-salida');

    const producto = productoInput.value.trim();
    const cantidad = parseInt(cantidadInput.value, 10);

    if (!producto || isNaN(cantidad) || cantidad <= 0) {
        alert("Por favor completa los campos correctamente.");
        return;
    }

    try {
        await salidasRef.add({
            producto: producto,
            cantidad: cantidad,
            usuario: usuarioActual,
            rol: rolActual,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });
        formSalida.reset();
        cantidadInput.value = "1";
    } catch (error) {
        alert("Ocurrió un error al guardar.");
    }
});

window.eliminarRegistro = async function(id) {
    if (rolActual !== 'Administrador') {
        alert("No tienes permisos.");
        return;
    }
    if (confirm("¿Estás seguro de eliminar este registro?")) {
        try {
            await salidasRef.doc(id).delete();
        } catch (error) {
            alert("No se pudo eliminar.");
        }
    }
};

salidasRef.orderBy('fecha', 'desc').onSnapshot((snapshot) => {
    listaHistorialHoy.innerHTML = '';
    cacheSalidas = [];
    
    if (snapshot.empty) {
        listaHistorialHoy.innerHTML = '<li style="text-align:center; color:#64748b; padding: 10px;">No hay registros hoy.</li>';
        bodyTotales.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #64748b;">No hay salidas hoy.</td></tr>';
        return;
    }

    const hoyStr = new Date().toDateString();
    const totalesHoy = {};
    let hayMovimientosHoy = false;

    snapshot.forEach((doc) => {
        const item = doc.data();
        const docId = doc.id;
        cacheSalidas.push({ id: docId, ...item });
        
        let fechaFormateada = 'Procesando...';
        let esDeHoy = false;

        if (item.fecha) {
            const dateObj = item.fecha.toDate();
            fechaFormateada = dateObj.toLocaleString('es-CO', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            if (dateObj.toDateString() === hoyStr) {
                esDeHoy = true;
            }
        }

        if (esDeHoy) {
            hayMovimientosHoy = true;
            const claveProd = item.producto.trim();
            if (!totalesHoy[claveProd]) {
                totalesHoy[claveProd] = 0;
            }
            totalesHoy[claveProd] += (item.cantidad || 0);

            let botonEliminar = rolActual === 'Administrador' ? `<button onclick="eliminarRegistro('${docId}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; margin-top:5px;">🗑️ Eliminar</button>` : '';

            const li = document.createElement('li');
            li.className = 'item-row';
            li.innerHTML = `
                <div>
                    <span class="item-name">${item.producto}</span>
                    <br><small style="color:#64748b;">Retirado por: <strong>${item.usuario}</strong> (${item.rol || 'Operador'})</small>
                    <br><small style="color:#94a3b8;">${fechaFormateada}</small>
                    ${botonEliminar ? '<br>' + botonEliminar : ''}
                </div>
                <div style="text-align: right;">
                    <span class="stock-badge">-${item.cantidad} u.</span>
                </div>
            `;
            listaHistorialHoy.appendChild(li);
        }
    });

    if (!hayMovimientosHoy) {
        listaHistorialHoy.innerHTML = '<li style="text-align:center; color:#64748b; padding: 10px;">No hay registros de salidas en el día de hoy.</li>';
    }

    bodyTotales.innerHTML = '';
    const productosHoy = Object.keys(totalesHoy);
    if (productosHoy.length === 0) {
        bodyTotales.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 10px; color: #64748b;">No hay salidas registradas hoy.</td></tr>';
    } else {
        productosHoy.forEach((prod) => {
            const totalCant = totalesHoy[prod];
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight: 600;">${prod}</td>
                <td style="padding: 10px; text-align: right; color: #ef4444; font-weight: bold;">-${totalCant} u.</td>
            `;
            bodyTotales.appendChild(tr);
        });
    }

    renderizarHistorialGeneral(cacheSalidas);
});

window.renderizarHistorialGeneral = function(lista) {
    const textoBusquedaInput = document.getElementById('buscar-nombre');
    const fechaFiltroInput = document.getElementById('filtro-fecha');
    
    const textoBusqueda = textoBusquedaInput ? textoBusquedaInput.value.toLowerCase().trim() : '';
    const fechaFiltro = fechaFiltroInput ? fechaFiltroInput.value : '';
    
    if (!listaHistorialGeneral) return;
    listaHistorialGeneral.innerHTML = '';

    let filtrados = lista.filter(item => {
        if (!item.producto) return false;
        const coincideNombre = item.producto.toLowerCase().includes(textoBusqueda);
        let coincideFecha = true;
        if (fechaFiltro && item.fecha) {
            const itemDateStr = item.fecha.toDate().toISOString().split('T')[0];
            coincideFecha = (itemDateStr === fechaFiltro);
        }
        return coincideNombre && coincideFecha;
    });

    if (filtrados.length === 0) {
        listaHistorialGeneral.innerHTML = '<li style="text-align:center; color:#64748b; padding: 10px;">No se encontraron registros con esos criterios.</li>';
        return;
    }

    filtrados.forEach((item) => {
        let fechaFormateada = 'Procesando...';
        if (item.fecha) {
            fechaFormateada = item.fecha.toDate().toLocaleString('es-CO', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }
        let botonEliminar = rolActual === 'Administrador' ? `<button onclick="eliminarRegistro('${item.id}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; margin-top:5px;">🗑️ Eliminar</button>` : '';

        const li = document.createElement('li');
        li.className = 'item-row';
        li.innerHTML = `
            <div>
                <span class="item-name">${item.producto}</span>
                <br><small style="color:#64748b;">Retirado por: <strong>${item.usuario}</strong> (${item.rol || 'Operador'})</small>
                <br><small style="color:#94a3b8;">${fechaFormateada}</small>
                ${botonEliminar ? '<br>' + botonEliminar : ''}
            </div>
            <div style="text-align: right;">
                <span class="stock-badge">-${item.cantidad} u.</span>
            </div>
        `;
        listaHistorialGeneral.appendChild(li);
    });
};

window.filtrarHistorialGeneral = function() {
    renderizarHistorialGeneral(cacheSalidas);
};