// API: User Registration
// Method: POST
// Path: /api/auth/register

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body;

    // 验证必填字段
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码必填' });
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        password: hashedPassword,
        role: 'USER'
      }
    });

    // 生成简单的 token（生产环境应该用 JWT）
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: '注册失败',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
