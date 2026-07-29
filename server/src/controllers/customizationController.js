import * as customizationService from '../services/customizationService.js';

/**
 * Controlador de Personalizaciones
 * Maneja las requests HTTP relacionadas con opciones de personalización
 */

/**
 * Obtiene todas las personalizaciones
 */
export async function getCustomizations(req, res) {
  try {
    const { tipo } = req.query;

    let customizations;
    if (tipo) {
      customizations = await customizationService.getCustomizationsByType(tipo);
    } else {
      customizations = await customizationService.getAllCustomizations();
    }

    res.json({
      success: true,
      data: customizations
    });
  } catch (error) {
    console.error('Error en getCustomizations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Obtiene una personalización por ID
 */
export async function getCustomization(req, res) {
  try {
    const { id } = req.params;
    const customization = await customizationService.getCustomizationById(id);

    if (!customization) {
      return res.status(404).json({
        success: false,
        error: 'Personalización no encontrada'
      });
    }

    res.json({
      success: true,
      data: customization
    });
  } catch (error) {
    console.error('Error en getCustomization:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Crea una nueva personalización
 */
export async function createCustomization(req, res) {
  try {
    const customizationData = req.body;
    const userId = req.user?.userId;

    const customization = await customizationService.createCustomization(customizationData, userId);

    res.status(201).json({
      success: true,
      data: customization
    });
  } catch (error) {
    console.error('Error en createCustomization:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Actualiza una personalización
 */
export async function updateCustomization(req, res) {
  try {
    const { id } = req.params;
    const customizationData = req.body;
    const userId = req.user?.userId;

    const customization = await customizationService.updateCustomization(id, customizationData, userId);

    res.json({
      success: true,
      data: customization
    });
  } catch (error) {
    console.error('Error en updateCustomization:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Elimina una personalización
 */
export async function deleteCustomization(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await customizationService.deleteCustomization(id, userId);

    res.json({
      success: true,
      message: 'Personalización eliminada correctamente'
    });
  } catch (error) {
    console.error('Error en deleteCustomization:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
