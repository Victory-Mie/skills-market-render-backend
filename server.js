import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import Prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Import auth utilities
import { verifyToken } from './utils/auth.js';
import bcrypt from 'bcryptjs';

// Auth API
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码必填' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        password: hashedPassword,
        role: 'USER'
      }
    });

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return res.status(201).json({
      message: '注册成功',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: '注册失败', message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码必填' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return res.status(200).json({
      message: '登录成功',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: '登录失败', message: error.message });
  }
});

// Orders API
app.get('/api/orders', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const {
      page = '1',
      limit = '20',
      status
    } = req.query;

    const where = { buyerId: decoded.userId };

    if (status) {
      where.paymentStatus = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          skill: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.order.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

// Skills API
app.get('/api/skills', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      category,
      search
    } = req.query;

    const where = {};

    if (category) {
      where.categorySlug = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.skill.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      skills,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return res.status(500).json({
      error: 'Failed to fetch skills',
      message: error.message
    });
  }
});

// My Skills API
app.get('/api/my-skills', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const {
      page = '1',
      limit = '20'
    } = req.query;

    const where = { authorId: decoded.userId };

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.skill.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      skills,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching my skills:', error);
    return res.status(500).json({
      error: 'Failed to fetch my skills',
      message: error.message
    });
  }
});

// User Profile API
app.get('/api/user/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message
    });
  }
});

app.patch('/api/user/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { name, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        ...(name && { name }),
        ...(avatar && { avatar })
      }
    });

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
