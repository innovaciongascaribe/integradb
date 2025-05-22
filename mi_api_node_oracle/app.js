require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const basicAuth = require('basic-auth');
const { body, validationResult } = require('express-validator');
const { getConnection } = require('./db');
const oracledb = require('oracledb');

const app = express();
app.use(express.json());
app.use(morgan('dev'));

// Middleware de autenticación básica
app.use((req, res, next) => {
  const user = basicAuth(req);
  const USER = process.env.AUTH_USER;
  const PASS = process.env.AUTH_PASS;

  if (!user || user.name !== USER || user.pass !== PASS) {
    res.set('WWW-Authenticate', 'Basic realm="example"');
    return res.status(401).send('Autenticación requerida');
  }
  next();
});

// POST: Guardar persona con validaciones
app.post(
  '/guardar',
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('edad').isInt({ min: 0 }).withMessage('Edad debe ser un número entero positivo'),
    body('correo').optional().isEmail().withMessage('Correo inválido')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const { nombre, edad, correo } = req.body;

    try {
      const connection = await getConnection();
      await connection.execute(
        `INSERT INTO personas (nombre, edad, correo) VALUES (:nombre, :edad, :correo)`,
        { nombre, edad, correo }
      );
      await connection.close();
      res.json({ mensaje: 'Datos insertados correctamente' });
    } catch (err) {
      console.error("Error completo:", err);
      res.status(500).json({ error: 'Error al insertar en Oracle' });
    }
  }
);

// GET: Todas las personas
app.get('/personas', async (req, res) => {
  try {
    const connection = await getConnection();
    const result = await connection.execute(
      `SELECT id, nombre, edad, correo FROM personas`,
      [],
      { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
    );
    await connection.close();
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener personas:", err);
    res.status(500).json({ error: 'Error al obtener personas' });
  }
});

// GET: Persona por ID
app.get('/personas/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const connection = await getConnection();
    const result = await connection.execute(
      `SELECT id, nombre, edad, correo FROM personas WHERE id = :id`,
      [id],
      { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
    );
    await connection.close();

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Persona no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener persona por ID:", err);
    res.status(500).json({ error: 'Error al obtener persona' });
  }
});

// PUT: Actualizar persona
app.put('/personas/:id',
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('edad').isInt({ min: 0 }).withMessage('Edad debe ser un número entero positivo'),
    body('correo').optional().isEmail().withMessage('Correo inválido')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const id = req.params.id;
    const { nombre, edad, correo } = req.body;

    try {
      const connection = await getConnection();
      const result = await connection.execute(
        `UPDATE personas SET nombre = :nombre, edad = :edad, correo = :correo WHERE id = :id`,
        { id, nombre, edad, correo },
        { autoCommit: true }
      );
      await connection.close();

      if (result.rowsAffected === 0) {
        return res.status(404).json({ mensaje: 'Persona no encontrada' });
      }

      res.json({ mensaje: 'Persona actualizada correctamente' });
    } catch (err) {
      console.error("Error al actualizar persona:", err);
      res.status(500).json({ error: 'Error al actualizar persona' });
    }
  }
);

// DELETE: Eliminar persona
app.delete('/personas/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM personas WHERE id = :id`,
      [id],
      { autoCommit: true }
    );
    await connection.close();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ mensaje: 'Persona no encontrada' });
    }

    res.json({ mensaje: 'Persona eliminada correctamente' });
  } catch (err) {
    console.error("Error al eliminar persona:", err);
    res.status(500).json({ error: 'Error al eliminar persona' });
  }
});

app.post(
  '/transaccion',
  [
  body('documentId').notEmpty().withMessage('documentId es obligatorio'),
  body('documentTypeCode').notEmpty().withMessage('documentTypeCode es obligatorio'),
  body('uuid').notEmpty().withMessage('uuid es obligatorio'),
  body('supplierNit').notEmpty().withMessage('supplierNit es obligatorio'),
  body('receiverNit').notEmpty().withMessage('receiverNit es obligatorio'),
  body('documentDate').isNumeric().withMessage('documentDate debe ser timestamp'),
  body('createdAt').isNumeric().withMessage('createdAt debe ser timestamp'),
  body('orderReference').notEmpty().withMessage('orderReference es obligatorio'),
  body('attachedDocumentUrl').notEmpty().withMessage('attachedDocumentUrl es obligatorio'),
  body('xmlUrl').notEmpty().withMessage('xmlUrl es obligatorio'),
  body('pdfUrl').notEmpty().withMessage('pdfUrl es obligatorio'),
  // Opcionales pero si vienen, deben ser tipo string válidos
  body('attachmentUrl')
    .optional()
    .isString().withMessage('attachmentUrl debe ser una cadena de texto'),
  body('electronicMail')
    .optional()
    .isEmail().withMessage('electronicMail debe ser un email válido'),
  body('actualDeliveryDate').isNumeric().withMessage('actualDeliveryDate debe ser timestamp')  
],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const jsonPayload = req.body;

    try {
      const connection = await getConnection();

      const result = await connection.execute(
        `
        BEGIN
          PKG_INTEGRACIONES.prcRegistraTransaccion(
            :sistemaEmisor,
            :token,
            :sistemaReceptor,
            :operacion,
            :iclPayload,
            :codigoError,
            :mensajeError
          );
        END;
        `,
        {
          sistemaEmisor: 'CADENA',
          sistemaReceptor: 'ONBASE',
          operacion: 'RECIVE_FACTRECEP',
          token: 'PRUEBA TOKEN CADENA',
          iclPayload: {
            val: JSON.stringify(jsonPayload),
            type: oracledb.CLOB
          },
          codigoError: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          mensajeError: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 1000 }
        }
      );

      await connection.close();

      if (result.outBinds.codigoError !== 0) {
        console.warn('Oracle devolvió error controlado:', result.outBinds);
        return res.status(400).json({
          mensaje: result.outBinds.mensajeError,
          codigo: result.outBinds.codigoError
        });
      }

      res.json({
        mensaje: result.outBinds.mensajeError,
        codigo: result.outBinds.codigoError
      });

    } catch (error) {
      console.error('Error inesperado al ejecutar prcRegistraTransaccion:', {
        message: error.message,
        stack: error.stack
      });

      res.status(500).json({
        mensaje: 'Error inesperado en el servidor',
        detalle: error.message
      });
    }
  }
);

// Iniciar servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
