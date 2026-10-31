// Configuración de tu proyecto de Firebase
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROJECT_ID.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROJECT_ID.appspot.com",
    messagingSenderId: "TU_NUMERO",
    appId: "TU_APP_ID"
};

// Inicializar Firebase y Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Referencia a la colección 'salidas'
const salidasRef = db.collection('salidas');

// Elementos DOM
const formSalida = document.getElementById('form-salida');
const listaHistorial = document.getElementById('lista-historial');
const userInfo = document.getElementById('user-info');
const userDisplay = document.getElementById('user-display');

// 1. Gestión del Nombre de Usuario (Inmutable tras el primer inicio)
let usuarioActual = localStorage.getItem('usuario_salidas');

if (!usuarioActual) {
    while (!usuarioActual || usuarioActual.trim() === '') {
        usuarioActual = prompt('Por favor, ingresa tu nombre de usuario para continuar (no se podrá cambiar):');
    }
    usuarioActual = usuarioActual.trim();
    localStorage.setItem('usuario_salidas', usuarioActual);
}

// Mostrar el nombre guardado en la interfaz
userDisplay.textContent = usuarioActual;
userInfo.style.display = 'block';

// 2. Registrar nueva salida
formSalida.addEventListener('submit', async (e) => {
    e.preventDefault();

    const producto = document.getElementById('producto-nombre').value.trim();
    const cantidad = parseInt(document.getElementById('cantidad-salida').value, 10);

    if (!producto || cantidad <= 0) return;

    try {
        await salidasRef.add({
            producto: producto,
            cantidad: cantidad,
            usuario: usuarioActual,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });

        formSalida.reset();
        document.getElementById('cantidad-salida').value = "1";
    } catch (error) {
        console.error("Error al registrar la salida: ", error);
        alert("Ocurrió un error al guardar el registro.");
    }
});

// 3. Escuchar e imprimir Historial en Tiempo Real (Ordenado de más reciente a antiguo)
salidasRef.orderBy('fecha', 'desc').onSnapshot((snapshot) => {
    listaHistorial.innerHTML = '';

    if (snapshot.empty) {
        listaHistorial.innerHTML = '<li style="text-align:center; color:#64748b; padding: 10px;">No hay registros de salidas aún.</li>';
        return;
    }

    snapshot.forEach((doc) => {
        const item = doc.data();
        
        // Formatear Fecha y Hora
        let fechaFormateada = 'Procesando...';
        if (item.fecha) {
            const dateObj = item.fecha.toDate();
            fechaFormateada = dateObj.toLocaleString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        const li = document.createElement('li');
        li.className = 'item-row';
        li.innerHTML = `
            <div>
                <span class="item-name">${item.producto}</span>
                <br><small style="color:#64748b;">Retirado por: <strong>${item.usuario}</strong></small>
                <br><small style="color:#94a3b8;">${fechaFormateada}</small>
            </div>
            <span class="stock-badge">-${item.cantidad} u.</span>
        `;
        listaHistorial.appendChild(li);
    });
}, (error) => {
    console.error("Error al obtener historial: ", error);
});