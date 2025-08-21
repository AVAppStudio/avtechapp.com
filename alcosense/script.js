// Agregar este código en script.js
if ('serviceWorker' in navigator) {
  let refreshing = false;

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        updateViaCache: 'none'
      });

      // Comprobar actualizaciones inmediatamente
      registration.update();

      // Comprobar actualizaciones cada 5 minutos
      setInterval(() => {
        registration.update();
        console.log('Buscando actualizaciones...');
      }, 5 * 60 * 1000);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            mostrarModalConfirmacion('HappyHours pregunta: ¿Deseas actualizar a la nueva versión?', function() {
              newWorker.postMessage('skipWaiting');
            }, function() {
              // No hacer nada si el usuario cancela
            });
          }
        });
      });
    } catch (error) {
      console.error('Error al registrar el service worker:', error);
    }
  }

  // Detectar cuando el service worker toma el control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  // Registrar el service worker cuando la página cargue
  window.addEventListener('load', registerServiceWorker);
}

document.addEventListener('DOMContentLoaded', function() {
   if (!localStorage.getItem('userAgreement')) {
       window.location.href = 'assets/www/user-agreement.html';
   }
});

const caloriasPorMl = {
    cerveza: 0.43,
    vino: 0.73,
    combinado: 2.23,
    combinada: {
        cola: 0.42,
        colaZero: 0.0,
        gaseosaLimonNaranja: 0.43,
        gaseosa: 0.40,
        solo: 0.0
    }
};
const graduacionAlcohol = {
   cerveza: 0.05,
   vino: 0.12,
   combinado: 0.4
};

const azucarPorMl = {
    cerveza: 0.009,
    vino: {
        frizzante: 0.095,  // 95g/L = 0.095g/ml
        tinto: 0.003,
        blanco: 0.003
    },
    combinada: {
        cola: 0.106,
        colaZero: 0,
        gaseosaLimonNaranja: 0.105,
        gaseosa: 0.09,
        solo: 0
    }
};


let pesoCorporal = 0;
let caloriasAcumuladas = 0;
let nivelAlcoholAcumulado = 0;
let azucarAcumulado = 0;
let registroConsumos = [];
let resultadosCalculados = false;
let selectedGender = null;

function selectGender(gender) {
   const maleSymbol = document.getElementById('maleSymbol');
   const femaleSymbol = document.getElementById('femaleSymbol');

   maleSymbol.classList.remove('selected');
   femaleSymbol.classList.remove('selected');

   if (gender === 'male') {
       maleSymbol.classList.add('selected');
   } else {
       femaleSymbol.classList.add('selected');
   }

   selectedGender = gender;
}

function cambiarPestana(pestana) {
   document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
   document.querySelector(`.tab:nth-child(${pestana === 'calorias' ? '1' : (pestana === 'alcoholimetro' ? '2' : '3')})`).classList.add('active');

   document.getElementById('calorias').style.display = 'none';
   document.getElementById('alcoholimetro').style.display = 'none';
   document.getElementById('registros').style.display = 'none';

   document.getElementById(pestana).style.display = 'block';

   if (pestana === 'alcoholimetro') {
           actualizarAlcoholimetro();
           document.querySelector('#alcoholimetro .info-button').style.display = 'flex';
       } else if (pestana === 'registros') {
           actualizarRegistros();
       }
   }

function actualizarAlcoholimetro() {
   if (!resultadosCalculados) {
       document.getElementById('alcoholimetroMensaje').style.display = 'block';
       document.getElementById('alcoholimetroResultados').style.display = 'none';
   } else {
       document.getElementById('alcoholimetroMensaje').style.display = 'none';
       document.getElementById('alcoholimetroResultados').style.display = 'block';

       const nivelAlcoholValor = document.getElementById('nivelAlcoholValor');
       nivelAlcoholValor.textContent = `${nivelAlcoholAcumulado.toFixed(3)} g/L`;

       if (nivelAlcoholAcumulado > 0.5) {
           nivelAlcoholValor.classList.remove('por-debajo-limite');
           nivelAlcoholValor.classList.add('sobre-limite');
       } else {
           nivelAlcoholValor.classList.remove('sobre-limite');
           nivelAlcoholValor.classList.add('por-debajo-limite');
       }

       actualizarAdvertencia();
   }
}

function actualizarAdvertencia() {
   const advertenciaElement = document.getElementById('advertencia');
   const taxiNumberElement = document.getElementById('taxiNumber');

   if (nivelAlcoholAcumulado > 0.5) {
       advertenciaElement.innerHTML = '🚫 No puedes conducir amig@, solicita un taxi y sé feliz.';
       advertenciaElement.classList.add('advertencia-prohibido');

       obtenerUbicacionUsuario(function(ciudad, lat, lon) {
           let busquedaTaxi = 'https://www.google.com/search?q=radio+taxi';
           let mensajeAdicional = '';
           let textoEnlace = 'Buscar taxi en';

           if (ciudad === '') {
               mensajeAdicional = '📍 Autorice permisos de ubicación para más precisión en Llame a su taxi.';
           } else {
               busquedaTaxi += `+${encodeURIComponent(ciudad)}`;
               textoEnlace += ` ${ciudad}`;
           }

           taxiNumberElement.innerHTML = `
                         <a href="#" onclick="extraerYLlamarTaxi(); return false;">Llame a su taxi </a>
                       <br>
                       <small></small>
           `;
           if (mensajeAdicional) {
               taxiNumberElement.innerHTML += `<br>${mensajeAdicional}`;
           }
       });
   } else {
       advertenciaElement.innerHTML = '⚠️ Tu nivel de alcohol está por debajo del límite legal (0,5g/L), pero recuerda que es mejor no conducir si has bebido lo más mínimo.';
       advertenciaElement.classList.remove('advertencia-prohibido');
       taxiNumberElement.innerHTML = '';
   }

   const nivelAlcoholValor = document.getElementById('nivelAlcoholValor');
   nivelAlcoholValor.textContent = `${nivelAlcoholAcumulado.toFixed(3)} g/L`;

   if (nivelAlcoholAcumulado > 0.5) {
       nivelAlcoholValor.classList.remove('por-debajo-limite');
       nivelAlcoholValor.classList.add('sobre-limite');
   } else {
       nivelAlcoholValor.classList.remove('sobre-limite');
       nivelAlcoholValor.classList.add('por-debajo-limite');
   }
}

function extraerYLlamarTaxi() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                    .then(response => response.json())
                    .then(data => {
                        const ciudad = data.address.city || data.address.town || data.address.village || '';
                        let searchQuery = 'radio taxi';
                        
                        if (ciudad) {
                            searchQuery += ' ' + ciudad;
                        }
                        
                        // Modificación específica para iOS
                        const searchURL = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                        
                        // En iOS, abrimos en una nueva ventana
                        window.open(searchURL, '_blank');
                    })
                    .catch(() => {
                        mostrarAlerta('HappyHours dice: No se puede realizar la búsqueda en este momento.');
                    });
            },
            function(error) {
                mostrarAlerta('HappyHours dice: No se puede acceder a la ubicación.');
            }
        );
    } else {
        mostrarAlerta('HappyHours dice: La geolocalización no está disponible.');
    }
}

function mostrarResultados() {
   document.getElementById('resultadoCalorias').textContent = caloriasAcumuladas.toFixed(2);
   document.getElementById('resultadoAzucar').textContent = azucarAcumulado.toFixed(2);
   const registroDiv = document.getElementById('registroConsumos');
   registroDiv.innerHTML = registroConsumos.map(consumo => `
       <p>Unds: ${consumo.unidades} (${consumo.bebida}), Kcal: ${consumo.calorias}, Azúcar: ${consumo.azucar} g</p>
   `).join('');

   document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
   document.getElementById('screen3').classList.add('active');

   resultadosCalculados = true;
}

function mostrarInformacion(tipo) {
   const infoScreen = document.getElementById('infoScreen');
   const infoTitle = document.getElementById('infoTitle');
   const infoMessage = document.getElementById('infoMessage');

   infoScreen.style.zIndex = '9999';
   infoScreen.style.display = 'block';
   document.body.style.overflow = 'hidden';

   if (tipo === 'calorias') {
       infoTitle.textContent = 'Información sobre calorías vacías';
       infoMessage.innerHTML = 'Las calorías que se muestran, son <strong>CALORÍAS VACÍAS</strong> ya que estas se encuentran presentes en aquellos <strong>alimentos que aportan mucha energía pero pocos o ningún nutriente</strong>. Es decir, con ellos ingerimos muchas calorías pero una mínima cantidad de fibra, minerales, vitaminas… Su abuso favorece, por tanto, <strong>el aumento de peso</strong>.';
   } else if (tipo === 'alcoholimetro') {
       infoTitle.textContent = 'Información sobre el alcoholímetro';
       infoMessage.innerHTML = 'Recuerde que el <strong>límite legal son 0,5g/L</strong>, si usted supera este límite está incumpliendo el Articulo 20, del Reglamento General de Circulación, en la redacción dada a los mismos por el Real Decreto 1333/1994, de 20 de junio.<br><br>Además recuerde que si la aplicación le muestra que <strong>ha superado o no dicho límite, no puede tomarlo como válido</strong>. Como debe saber, hay otros factores como edad y la ingesta de comida que puede <strong>alterar notablemente dicha medición y resultado</strong>.';
   }
}

function cerrarInformacion() {
   const infoScreen = document.getElementById('infoScreen');
   infoScreen.style.display = 'none';
   document.body.style.overflow = '';
}

function obtenerUbicacionUsuario(callback) {
   if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(function(position) {
           const lat = position.coords.latitude;
           const lon = position.coords.longitude;

           fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
               .then(response => response.json())
               .then(data => {
                   const ciudad = data.address.city || data.address.town || data.address.village || 'Unknown';
                   callback(ciudad, lat, lon);
               })
               .catch(error => {
                   console.error("Error getting city name: ", error);
                   callback('Unknown', lat, lon);
               });
       }, function(error) {
           console.error("Error obtaining location: ", error);
           callback('', 0, 0);
       });
   } else {
       console.error("Geolocation not supported by the browser.");
       callback('', 0, 0);
   }
}

function volverInicio() {
   if (resultadosCalculados) {
       guardarRegistro();
       pesoCorporal = 0;
       caloriasAcumuladas = 0;
       nivelAlcoholAcumulado = 0;
       azucarAcumulado = 0;
       registroConsumos = [];
       resultadosCalculados = false;
       selectedGender = null;
       document.getElementById('peso').value = '';
       document.getElementById('peso').removeAttribute('readonly');
       document.getElementById('maleSymbol').classList.remove('selected');
       document.getElementById('femaleSymbol').classList.remove('selected');
   } else {
       document.getElementById('peso').value = pesoCorporal;
   }

   document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
   document.getElementById('screen1').classList.add('active');
   cambiarPestana('calorias');
}

function anadirOtraBebida() {
   document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
   document.getElementById('screen1').classList.add('active');
   document.getElementById('peso').value = pesoCorporal;
   document.getElementById('peso').setAttribute('readonly', true);
}

function siguientePantalla(tipoBebida) {
   try {
       const peso = parseFloat(document.getElementById('peso').value);
       const buttons = document.querySelectorAll('button');

       buttons.forEach(button => {
           if (button && !button.hasAttribute('disabled')) {
               button.style.fontSize = '18px';
           }
       });

       if (!peso || peso <= 0) {
           mostrarAlerta('Por favor, ingresa un peso válido.');
           return;
       }

       if (!selectedGender) {
           mostrarAlerta('Por favor, selecciona tu género.');
           return;
       }

       if (pesoCorporal === 0) {
           pesoCorporal = peso;
           document.getElementById('peso').value = pesoCorporal;
           document.getElementById('peso').setAttribute('readonly', true);
       }

       const currentScreen = document.getElementById('screen1');
       const nextScreen = document.getElementById('screen2' + tipoBebida.charAt(0).toUpperCase() + tipoBebida.slice(1));

       if (currentScreen && nextScreen) {
           currentScreen.classList.remove('active');
           nextScreen.classList.add('active');
       } else {
           mostrarAlerta('Ha ocurrido un error. Por favor, intenta de nuevo.');
       }
   } catch (error) {
       mostrarAlerta('Ha ocurrido un error inesperado. Por favor, intenta de nuevo.');
       console.error('Error en siguientePantalla:', error);
   }
}

function calcularResultado(tipoBebida) {
   let unidades, ml, caloriasBebida = 0;
   let alcoholConsumido = 0;
   let azucarConsumido = 0;

   switch(tipoBebida) {
       case 'cerveza':
           unidades = parseFloat(document.getElementById('unidadesCerveza').value);
           ml = parseFloat(document.getElementById('tipoCerveza').value);
           caloriasBebida = Math.round(unidades * ml * caloriasPorMl.cerveza);
           alcoholConsumido = unidades * ml * graduacionAlcohol.cerveza;
           azucarConsumido = unidades * ml * azucarPorMl.cerveza;
           break;
       case 'vino':
           unidades = parseFloat(document.getElementById('unidadesVino').value);
           ml = 150;
           caloriasBebida = Math.round(unidades * ml * caloriasPorMl.vino);
           alcoholConsumido = unidades * ml * graduacionAlcohol.vino;
           azucarConsumido = unidades * ml * azucarPorMl.vino;
           break;
       case 'combinado':
           unidades = parseFloat(document.getElementById('unidadesCombinado').value);
           ml = 65;
           const bebidaMezcla = document.getElementById('combinadaCon').value;
           const caloriasMezcla = Math.round(330 * caloriasPorMl.combinada[bebidaMezcla]);
           caloriasBebida = Math.round(unidades * ml * caloriasPorMl.combinado) + (unidades * caloriasMezcla);
           alcoholConsumido = unidades * ml * graduacionAlcohol.combinado;
           azucarConsumido = unidades * 330 * azucarPorMl.combinada[bebidaMezcla];
           break;
   }

   caloriasAcumuladas += caloriasBebida;
   azucarAcumulado += azucarConsumido;

   const factorDistribucion = selectedGender === 'male' ? 0.68 : 0.55;
   const alcoholEnGramos = alcoholConsumido * 0.789;
   nivelAlcoholAcumulado += alcoholEnGramos / (pesoCorporal * factorDistribucion);

   registroConsumos.push({
       bebida: tipoBebida,
       unidades: unidades,
       calorias: caloriasBebida,
       alcohol: (alcoholEnGramos / (pesoCorporal * factorDistribucion)).toFixed(3),
       azucar: azucarConsumido.toFixed(2)
   });

   mostrarResultados();
}

function guardarRegistro() {
   const fecha = new Date();
   const registro = {
       fecha: fecha.toISOString(),
       pesoCorporal: pesoCorporal,
       genero: selectedGender,
       caloriasAcumuladas: caloriasAcumuladas,
       nivelAlcoholAcumulado: nivelAlcoholAcumulado,
       azucarAcumulado: azucarAcumulado,
       registroConsumos: registroConsumos
   };

   let registros = JSON.parse(localStorage.getItem('registrosHoraFeliz')) || [];
   registros.push(registro);
   localStorage.setItem('registrosHoraFeliz', JSON.stringify(registros));
}

function actualizarRegistros() {
   const registrosContenido = document.getElementById('registrosContenido');
   const registros = JSON.parse(localStorage.getItem('registrosHoraFeliz')) || [];

   if (registros.length === 0) {
       registrosContenido.innerHTML = `
           <div style="text-align: center; padding: 20px; color: #666;">
               <i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 15px; color: #999;"></i>
               <p style="font-size: 18px; margin-bottom: 10px;">No hay registros disponibles aún</p>
               <p style="font-size: 14px;">Calcula algunas bebidas y vuelve a inicio, para ver el registro aquí</p>
           </div>
       `;
   } else {
       let contenidoHTML = '';
       registros.forEach((registro, index) => {
           const fecha = new Date(registro.fecha);
           contenidoHTML += `
               <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; position: relative;">
                   <button onclick="eliminarRegistro(${index})" style="position: absolute; top: 5px; right: 5px; background: none; border: none; cursor: pointer; padding: 0; width: 20px; height: 20px;">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <path d="M6 6L18 18M18 6L6 18" stroke="#FF5555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                           <path d="M6 6L18 18M18 6L6 18" stroke="#AA0000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 1)"/>
                       </svg>
                   </button>
                   <h3>Registro ${index + 1} - ${fecha.toLocaleString()}</h3>
                   <p>Género: ${registro.genero === 'male' ? 'Hombre' : 'Mujer'}</p>
                   <p>Peso: ${registro.pesoCorporal} kg</p>
                   <p>Calorías: ${registro.caloriasAcumuladas} Kcal</p>
                   <p>Nivel de alcohol: ${registro.nivelAlcoholAcumulado.toFixed(3)} g/L</p>
                   <p>Azúcar: ${registro.azucarAcumulado.toFixed(2)} g</p>
                   <h4>Bebidas consumidas:</h4>
                   <ul>
                       ${registro.registroConsumos.map(consumo => `
                           <li>${consumo.unidades} ${consumo.bebida}(s) - ${consumo.calorias} Kcal - ${consumo.azucar} gr</li>
                       `).join('')}
                   </ul>
               </div>
           `;
       });
       registrosContenido.innerHTML = contenidoHTML;
   }
}

function eliminarRegistro(index) {
   mostrarModalConfirmacion('¿Estás seguro de que quieres eliminar este registro?', function() {
       let registros = JSON.parse(localStorage.getItem('registrosHoraFeliz')) || [];
       registros.splice(index, 1);
       localStorage.setItem('registrosHoraFeliz', JSON.stringify(registros));
       actualizarRegistros();
   });
}

function mostrarModalConfirmacion(mensaje, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-popup';
    modal.innerHTML = `
        <div class="modal-popup-content">
            <h3 style="margin-bottom: 15px;">Confirmar acción</h3>
            <p style="margin-bottom: 20px;">${mensaje}</p>
            <div class="modal-popup-buttons">
                <button class="modal-popup-button modal-popup-button-cancel" id="cancelarEliminar">
                    Cancelar
                </button>
                <button class="modal-popup-button modal-popup-button-confirm" id="confirmarEliminar">
                    Eliminar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Animación de entrada
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.transition = 'opacity 0.3s ease-in-out';
    }, 10);

    function cerrarModal() {
        modal.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    }

    document.getElementById('confirmarEliminar').onclick = function() {
        onConfirm();
        cerrarModal();
    };

    document.getElementById('cancelarEliminar').onclick = cerrarModal;

    // Cerrar al hacer clic fuera del modal
    modal.onclick = function(e) {
        if (e.target === modal) {
            cerrarModal();
        }
    };

    // Cerrar con la tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarModal();
        }
    }, { once: true });
}

function mostrarAlerta(mensaje, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-popup';
    modal.innerHTML = `
        <div class="modal-popup-content">
            <h3 style="margin-bottom: 15px;">Happy Hours dice:</h3>
            <p style="margin-bottom: 20px;">${mensaje}</p>
            <div class="modal-popup-buttons">
                <button class="modal-popup-button modal-popup-button-confirm" id="confirmarAlerta">
                    OK
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Animación de entrada
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.transition = 'opacity 0.3s ease-in-out';
    }, 10);

    function cerrarModal() {
        modal.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(modal);
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        }, 300);
    }

    document.getElementById('confirmarAlerta').onclick = cerrarModal;

    // Cerrar al hacer clic fuera del modal
    modal.onclick = function(e) {
        if (e.target === modal) {
            cerrarModal();
        }
    };

    // Cerrar con la tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarModal();
        }
    }, { once: true });
}

// Para mantener consistencia, también actualizamos la función mostrarModalConfirmacion
function mostrarModalConfirmacion(mensaje, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'modal-popup';
    modal.innerHTML = `
        <div class="modal-popup-content">
            <h3 style="margin-bottom: 15px;">Happy Hours pregunta:</h3>
            <p style="margin-bottom: 20px;">${mensaje}</p>
            <div class="modal-popup-buttons">
                <button class="modal-popup-button modal-popup-button-cancel" id="cancelarAccion">
                    No
                </button>
                <button class="modal-popup-button modal-popup-button-confirm" id="confirmarAccion">
                    Sí
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Animación de entrada
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.transition = 'opacity 0.3s ease-in-out';
    }, 10);

    function cerrarModal() {
        modal.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    }

    document.getElementById('confirmarAccion').onclick = function() {
        cerrarModal();
        if (typeof onConfirm === 'function') onConfirm();
    };

    document.getElementById('cancelarAccion').onclick = function() {
        cerrarModal();
        if (typeof onCancel === 'function') onCancel();
    };

    // Cerrar al hacer clic fuera del modal
    modal.onclick = function(e) {
        if (e.target === modal) {
            cerrarModal();
            if (typeof onCancel === 'function') onCancel();
        }
    };

    // Cerrar con la tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarModal();
            if (typeof onCancel === 'function') onCancel();
        }
    }, { once: true });
}

function locationPermissionGranted() {
   actualizarAdvertencia();
}

function locationPermissionDenied() {
   actualizarAdvertencia();
}
