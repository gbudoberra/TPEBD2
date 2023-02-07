# Notion Bases 2

## Contenido
- [Prerequisitos](#prerequisitos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instrucciones de Compilacion](#instrucciones-de-compilación-%EF%B8%8F)
- [Ejecucion](#ejecución-)
- [Autores](#autores-)

## Prerequisitos

Para correr correctamente el proyecto el usuario debe tener instalado: 
 - [Node.js](https://nodejs.org/en/download/)
 - [Postgres](https://www.postgresql.org/)
 - [Mongo](https://www.mongodb.com/es)
 
También tener un archivo llamado .env que tenga la siguiente estructura:
```
MONGODB_URI = <mongo_url>
POSTGRES_URI = <postgres_url>
SESSION_KEY = <key>
```
-

## Estructura del Proyecto
- **src**: carpeta base del proyecto
  - **models**: contiene los schemas para representar la informacion, en este caso solo las Notas.
  - **views**: vistas de FrontEnd simples en .ejs para testear la funcionalidad.
  - dbConfig.js: archivo de configuración para la conexión con la Base de Datos PostgreSQL.
  - passportConfig.js: Validación de usuarios:contraseña.
  - server.js: aplicación Node.
  - swagger.js: archivo con la configuración de Swagger.

## Instrucciones de Compilación 🛠️
Instalar todas las dependencias
```
npm install
```

## Ejecución 🚀

Correr la aplicación
```
npm run dev
```

Se levantara una aplicación Node.
La documentación mediante Swagger se encuentra en [/api-doc](http://localhost:3000/api-doc/)


## Autores 💭
* [**Gaspar Budó Berra**](https://github.com/gbudoberra)
* [**Bruno Squillari**](https://github.com/bsquillari)
* [**Facundo Zimbimbakis**](https://github.com/fzimbimbakis)
