import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '@data/database';

const router = Router();

/**
 * GET /api/parameter-templates
 * Get all parameter templates, optionally filtered by category
 * Query params:
 *   - category: Filter by specific category
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const db = getDatabase();

    const { data, error } = await db.rpc('get_parameter_templates', {
      p_category: category || null
    });

    if (error) throw error;

    // Group by category for easier frontend consumption
    const grouped = (data || []).reduce((acc: any, item: any) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push({
        id: item.id,
        name: item.template_name,
        order: item.display_order,
        metadata: item.metadata
      });
      return acc;
    }, {});

    return res.json({
      templates: data || [],
      grouped
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/parameter-templates
 * Add a custom template (user-contributed)
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, templateName } = req.body;

    if (!category || !templateName) {
      return res.status(400).json({ error: 'Category and template name are required' });
    }

    const db = getDatabase();
    const { data, error } = await db.rpc('add_custom_template', {
      p_category: category,
      p_template_name: templateName
    });

    if (error) throw error;

    return res.status(201).json({ 
      id: data,
      category,
      templateName
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/parameter-templates/categories
 * Get distinct categories
 */
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();

    const { data, error } = await db
      .from('parameter_templates')
      .select('category')
      .eq('is_active', true)
      .order('category');

    if (error) throw error;

    // Get unique categories
    const categories = [...new Set((data || []).map((item: any) => item.category))];

    return res.json({ categories });
  } catch (error) {
    return next(error);
  }
});

export default router;
