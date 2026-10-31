// Configuración de tu proyecto de Firebase
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

// Referencia a la colección en la raíz
const inventarioRef = db.collection('inventario');

const productoSelect = document.getElementById('producto-select');
const formSalida = document.getElementById('form-salida');
const listaInventario = document.getElementById('lista-inventario');

// 1. Escuchar cambios en tiempo real (onSnapshot)
inventarioRef.onSnapshot((snapshot) => {
    // Limpiar desplegable y lista
    productoSelect.innerHTML = '<option value="">Seleccione un producto...</option>';
    listaInventario.innerHTML = '';

    if (snapshot.empty) {
        listaInventario.innerHTML = '<li style="text-align:center; color:#64748b;">No hay productos registrados en la base de datos.</li>';
        return;
    }

    snapshot.forEach((doc) => {
        const item = doc.data();
        const id = doc.id;

        // Llenar el selector para registrar salida
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${item.nombre} (Stock: ${item.stock})`;
        productoSelect.appendChild(option);

        // Llenar la lista visible abajo
        const li = document.createElement('li');
        li.className = 'item-row';
        li.innerHTML = `
            <div>
                <span class="item-name">${item.nombre}</span>
                <br><small style="color:#64748b;">${item.categoria || 'Sin categoría'}</small>
            </div>
            <span class="stock-badge">${item.stock} unidades</span>
        `;
        listaInventario.appendChild(li);
    });
}, (error) => {
    console.error("Error conectando con Firestore: ", error);
});

// 2. Descontar stock al enviar el formulario
formSalida.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productoId = productoSelect.value;
    const cantidadRetirar = parseInt(document.getElementById('cantidad-salida').value, 10);

    if (!productoId) {
        alert("Selecciona un producto válido.");
        return;
    }

    try {
        const docRef = inventarioRef.doc(productoId);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            const stockActual = Number(data.stock) || 0;

            // Validar existencia de stock suficiente
            if (stockActual < cantidadRetirar) {
                alert(`No hay suficiente inventario. Disponible: ${stockActual}`);
                return;
            }

            // Restar la cantidad seleccionada
            const nuevoStock = stockActual - cantidadRetirar;

            // Actualizar en Firestore
            await docRef.update({
                stock: nuevoStock
            });

            alert(`Salida exitosa: Se retiraron ${cantidadRetirar} unidad(es) de ${data.nombre}.`);
            formSalida.reset();
        }
    } catch (error) {
        console.error("Error al descontar del stock: ", error);
        alert("Ocurrió un error al procesar la salida.");
    }
});