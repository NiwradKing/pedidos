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

// Inicializar Firebase y Firestore de forma segura
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const salidasRef = db.collection('salidas');

// Elementos DOM
const formSalida = document.getElementById('form-salida');
const listaHistorial = document.getElementById('lista-historial');
const userInfo = document.getElementById('user-info');
const userDisplay = document.getElementById('user-display');

// 1. Gestión del Nombre y Rol del Usuario (Inmutable tras el primer inicio)
let usuarioActual = localStorage.getItem('usuario_salidas');
let rolActual = localStorage.getItem('rol_salidas');

if (!usuarioActual || !rolActual) {
    while (!usuarioActual || usuarioActual.trim() === '') {
        usuarioActual = prompt('Ingresa tu nombre para continuar (no se podrá cambiar):');
    }
    usuarioActual = usuarioActual.trim();
    
    // Preguntar el rol de forma sencilla
    let eleccionRol = prompt('Selecciona tu rol:\n1. Operador\n2. Administrador', '1');
    rolActual = (eleccionRol === '2') ? 'Administrador' : 'Operador';

    localStorage.setItem('usuario_salidas', usuarioActual);
    localStorage.setItem('rol_salidas', rolActual);
}

// Mostrar el nombre y rol en la interfaz
if (userDisplay && userInfo) {
    userDisplay.textContent = `${usuarioActual} (${rolActual})`;
    userInfo.style.display = 'block';
}

// 2. Registrar nueva salida
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
        console.error("Error al registrar la salida: ", error);
        alert("Ocurrió un error al guardar el registro: " + error.message);
    }
});

// Función global para que los administradores puedan eliminar un registro
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

// 3. Escuchar e imprimir Historial en Tiempo Real
salidasRef.orderBy('fecha', 'desc').onSnapshot((snapshot) => {
    listaHistorial.innerHTML = '';

    if (snapshot.empty) {
        listaHistorial.innerHTML = '<li style="text-align:center; color:#64748b; padding: 10px;">No hay registros de salidas aún.</li>';
        return;
    }

    snapshot.forEach((doc) => {
        const item = doc.data();
        const docId = doc.id;
        
        let fechaFormateada = 'Procesando...';
        if (item.fecha) {
            const dateObj = item.fecha.toDate();
            fechaFormateada = dateObj.toLocaleString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Si es administrador, agregamos un botón de eliminar visible en el historial
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
                <br><small style="color:#94a3b8;">${fechaFormateada}</small>
                ${botonEliminar ? '<br>' + botonEliminar : ''}
            </div>
            <span class="stock-badge">-${item.cantidad} u.</span>
        `;
        listaHistorial.appendChild(li);
    });
}, (error) => {
    console.error("Error al obtener historial: ", error);
    listaHistorial.innerHTML = `<li style="color:red; text-align:center; padding: 10px;">Error al cargar historial: ${error.message}</li>`;
});