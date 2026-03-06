import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MiniWall API',
      version: '1.0.0',
      description: 'CSM020 Coursework — Social wall SaaS API',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
          },
        },
        Post: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            owner: { $ref: '#/components/schemas/User' },
            likes: { type: 'array', items: { type: 'object' } },
            likeCount: { type: 'integer' },
            comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
            text: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Registration and login' },
      { name: 'Posts', description: 'Post CRUD, comments, and likes' },
      { name: 'Search', description: 'Full-text and filtered search' },
    ],
    paths: {
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'email', 'password'],
                  properties: {
                    username: { type: 'string', example: 'johndoe' },
                    email: { type: 'string', example: 'john@example.com' },
                    password: { type: 'string', example: 'password1' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User created, returns JWT' },
            409: { description: 'Email or username already taken' },
            422: { description: 'Validation error' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive a JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'john@example.com' },
                    password: { type: 'string', example: 'password1' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful, returns JWT' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/posts': {
        get: {
          tags: ['Posts'],
          summary: 'List posts sorted by likes then newest',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: {
            200: { description: 'Paginated post list' },
            401: { description: 'No/invalid token' },
          },
        },
        post: {
          tags: ['Posts'],
          summary: 'Create a new post',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'description'],
                  properties: {
                    title: { type: 'string', example: 'My first post' },
                    description: { type: 'string', example: 'Hello MiniWall world!' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Post created' },
            401: { description: 'Unauthorised' },
            422: { description: 'Validation error' },
          },
        },
      },
      '/posts/{id}': {
        get: {
          tags: ['Posts'],
          summary: 'Get a single post',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Post found' }, 404: { description: 'Not found' } },
        },
        put: {
          tags: ['Posts'],
          summary: 'Update a post (owner only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Updated' }, 403: { description: 'Not owner' }, 404: { description: 'Not found' } },
        },
        delete: {
          tags: ['Posts'],
          summary: 'Delete a post (owner only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' }, 403: { description: 'Not owner' } },
        },
      },
      '/posts/{id}/comments': {
        get: {
          tags: ['Posts'],
          summary: 'Get all comments on a post',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Comment list' } },
        },
      },
      '/posts/{id}/comment': {
        post: {
          tags: ['Posts'],
          summary: 'Add a comment (non-owner only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['text'],
                  properties: { text: { type: 'string', example: 'Great post!' } },
                },
              },
            },
          },
          responses: { 201: { description: 'Comment added' }, 403: { description: 'Owner cannot comment own post' } },
        },
      },
      '/posts/{id}/comment/{commentId}': {
        delete: {
          tags: ['Posts'],
          summary: 'Delete own comment',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Deleted' }, 403: { description: 'Not your comment' } },
        },
      },
      '/posts/{id}/like': {
        post: {
          tags: ['Posts'],
          summary: 'Like a post (non-owner only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            201: { description: 'Liked' },
            403: { description: 'Owner cannot like own post' },
            409: { description: 'Already liked' },
          },
        },
        delete: {
          tags: ['Posts'],
          summary: 'Unlike a post',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Unliked' }, 409: { description: 'Not liked yet' } },
        },
      },
      '/search': {
        get: {
          tags: ['Search'],
          summary: 'Search posts by title, owner, or date range',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'title', in: 'query', schema: { type: 'string' }, description: 'Keyword search on title' },
            { name: 'owner', in: 'query', schema: { type: 'string' }, description: 'Filter by username or user ID' },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Posts created on or after this date' },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Posts created on or before this date' },
          ],
          responses: {
            200: { description: 'Matching posts' },
            400: { description: 'No query params provided' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
