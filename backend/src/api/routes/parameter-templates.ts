import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { getDatabase, getAuthenticatedDatabase } from '@data/database';
import { AuthRequest } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/parameter-templates
 * Get all parameter templates for the authenticated user's organization
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = req.accessToken
      ? getAuthenticatedDatabase(req.accessToken)
      : getDatabase();

    // Query parameter_templates directly with organization filter
    let query = db
      .from('parameter_templates')
      .select('id, category, template_name, display_order, metadata')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true })
      .order('template_name', { ascending: true });

    if (category) {
      query = query.eq('category', category as string);
    }

    const { data, error } = await query;

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
 * Add a custom template for the authenticated user's organization
 */
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, templateName } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!category || !templateName) {
      return res.status(400).json({ error: 'Category and template name are required' });
    }

    const db = req.accessToken
      ? getAuthenticatedDatabase(req.accessToken)
      : getDatabase();

    // Insert directly instead of using RPC
    const { data, error } = await db
      .from('parameter_templates')
      .insert({
        organization_id: organizationId,
        category,
        template_name: templateName,
        display_order: 1000, // Custom templates go at the end
        is_active: true
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({ 
          error: 'A template with this name already exists in this category' 
        });
      }
      throw error;
    }

    return res.status(201).json({ 
      id: data.id,
      category: data.category,
      templateName: data.template_name
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/parameter-templates/:id
 * Delete a custom template (soft delete - sets is_active = false)
 */
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = req.accessToken
      ? getAuthenticatedDatabase(req.accessToken)
      : getDatabase();

    // Verify the template belongs to this organization before deleting
    const { data: template } = await db
      .from('parameter_templates')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.organization_id !== organizationId) {
      return res.status(403).json({ error: 'Cannot delete template from another organization' });
    }

    // Soft delete
    const { error } = await db
      .from('parameter_templates')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
