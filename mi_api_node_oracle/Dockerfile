# Usar imagen base oficial de Node.js
FROM node:18

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos al contenedor
COPY package*.json ./
COPY . .

# Instalar dependencias
RUN npm install

# Exponer el puerto en el que corre la app
EXPOSE 3000

# Comando para ejecutar la app
CMD [ "node", "app.js" ]
