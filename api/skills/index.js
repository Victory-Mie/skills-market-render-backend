// API: Get All Skills
// Method: GET
// Path: /api/skills

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse query parameters
    const {
      page = '1',
      limit = '20',
      sort = 'updatedAt',
      order = 'desc',
      category,
      search,
      minPrice,
      maxPrice,
      free,
      official
    } = req.query;

    // Build where clause
    const where = {};

    // Filter by category
    if (category) {
      where.categoryId = category;
    }

    // Filter by search term
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Filter free/paid
    if (free === 'true') {
      where.price = 0;
    }

    // Filter official skills only
    if (official === 'true') {
      where.official = true;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Query skills
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
          },
          tags: {
            include: {
              tag: true
            }
          }
        },
        orderBy: {
          [sort]: order
        },
        skip,
        take: limitNum
      }),
      prisma.skill.count({ where })
    ]);

    // Return paginated response
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
  } finally {
    await prisma.$disconnect();
  }
}
