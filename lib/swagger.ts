import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Salsa Dental Clinic API',
      version: '1.0.0',
      description: 'API Documentation untuk sistem manajemen antrian, EMR, dan keuangan Salsa Dental Clinic',
      contact: {
        name: 'Admin',
        email: 'admin@salsadental.com',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./app/api/**/*.ts'], // path ke file route handlers
};

export const swaggerSpec = swaggerJsdoc(options);