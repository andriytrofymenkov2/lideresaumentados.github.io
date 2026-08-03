# Líderes Aumentados — Landing del workshop

Página de inscripción al workshop ejecutivo de IA y Liderazgo.
**5 de septiembre · 10:00–14:00 · Cámara de Comercio, Río Gallegos.**

Publicada en https://lideresaumentados.github.io/

## Cómo está hecha

HTML, CSS y JavaScript planos, sin build ni dependencias. Se edita y se sube tal cual.

```
index.html    estructura y contenido
styles.css    estilos
script.js     navegación, animaciones y envío del formulario
assets/       imágenes en AVIF y WebP
```

## Formulario de inscripción

Los datos van a un Google Apps Script que envía un mail con cada solicitud.
La URL del script está en `script.js` (constante `GAS_URL`).

El código del backend **no vive en este repo**: está en script.google.com.
Si se modifica, hay que crear una **nueva implementación** para que los cambios
tomen efecto — no alcanza con guardar.

Límite de envíos: 100 mails por día (cuenta gratuita de Gmail).

## Historial

Antes de este sitio, el repo alojaba la plataforma de módulos del programa.
Sigue en el historial de git y se puede recuperar.
