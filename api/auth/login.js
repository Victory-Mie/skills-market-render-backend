// API: User Login
// Method: POST
// Path: /api/auth/login

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // 验证必填字段
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码必填' });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 生成简单的 token（生产环境应该用 JWT）
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return res.status(200).json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: '登录失败',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
