import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { AddShoppingCart as AddItemIcon } from '@mui/icons-material';
import { Item } from '../types/inventory';

// Material catalog item type
type MaterialCatalogItem = {
  id: string;
  name: string;
  category: string;
  price: number; // Customer price (with markup)
  unit: string;
  sku?: string;
  current_stock?: number;
  minimum_stock?: number;
  isLowStock?: boolean;
  description?: string;
  costPrice?: number; // Base cost price
  markupPercentage?: number; // Markup percentage applied
};

interface MaterialsCatalogSidebarProps {
  materialsCatalog: MaterialCatalogItem[];
  lowStockItems: Item[];
  inventoryLoading: boolean;
  materialMarkupTiers: Array<{ min: number; max: number; markup: number }>;
  selectedMaterialQuantity: Record<string, number>;
  setSelectedMaterialQuantity: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onAddMaterial: (material: MaterialCatalogItem) => void;
}

const MaterialsCatalogSidebar: React.FC<MaterialsCatalogSidebarProps> = ({
  materialsCatalog,
  lowStockItems,
  inventoryLoading,
  materialMarkupTiers,
  selectedMaterialQuantity,
  setSelectedMaterialQuantity,
  onAddMaterial
}) => {
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Section */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          🔧 Materials Catalog
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select materials to add to your estimate. Prices include standard markup.
        </Typography>
        
        {/* Search bar */}
        <TextField
          fullWidth
          placeholder="Search materials..."
          value={materialSearchQuery}
          onChange={(e) => setMaterialSearchQuery(e.target.value)}
          size="small"
        />
      </Box>

      {/* Content Section */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Low stock warning */}
        {lowStockItems.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Low Stock Alert:</strong> {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low. 
            Items: {lowStockItems.slice(0, 2).map(item => item.name).join(', ')}
            {lowStockItems.length > 2 && ` and ${lowStockItems.length - 2} more`}.
          </Alert>
        )}
        
        {/* Inventory loading indicator */}
        {inventoryLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="caption">Loading inventory data...</Typography>
          </Box>
        )}
        
        {/* Markup tier information */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
            📊 Markup Tiers
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {materialMarkupTiers.slice(0, 3).map((tier, index) => (
              <Typography key={index} variant="caption" sx={{ fontSize: '11px' }}>
                ${tier.min === 0 ? '0' : tier.min.toFixed(0)}-{tier.max === Infinity ? '∞' : '$' + tier.max.toFixed(0)}: {(tier.markup * 100).toFixed(0)}%
              </Typography>
            ))}
            {materialMarkupTiers.length > 3 && (
              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
                +{materialMarkupTiers.length - 3} more tiers
              </Typography>
            )}
          </Box>
        </Box>
        
        {/* Materials list grouped by category */}
        {Array.from(new Set(materialsCatalog
          .filter(item => 
            materialSearchQuery === '' || 
            item.name.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(materialSearchQuery.toLowerCase())
          )
          .map(item => item.category)
        )).map(category => {
          const filteredMaterials = materialsCatalog
            .filter(item => item.category === category)
            .filter(item => 
              materialSearchQuery === '' || 
              item.name.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
              item.category.toLowerCase().includes(materialSearchQuery.toLowerCase())
            );
          
          if (filteredMaterials.length === 0) return null;
          
          return (
            <Box key={category} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ 
                color: 'primary.main',
                fontWeight: 'bold',
                borderBottom: '1px solid',
                borderColor: 'primary.main',
                pb: 0.5,
                mb: 1.5
              }}>
                {category}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredMaterials.map(material => (
                  <Card 
                    key={material.id}
                    sx={{ 
                      transition: 'all 0.2s',
                      '&:hover': { 
                        transform: 'translateY(-1px)',
                        boxShadow: 2
                      }
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="body2" fontWeight="bold" noWrap title={material.name} sx={{ mb: 0.5 }}>
                        {material.name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" color="primary" sx={{ fontSize: '1rem' }}>
                          ${material.price.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          per {material.unit}
                        </Typography>
                      </Box>
                      
                      {/* Cost and markup information */}
                      {material.costPrice && material.markupPercentage && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', display: 'block', mb: 0.5 }}>
                          Cost: ${material.costPrice.toFixed(2)} • {material.markupPercentage.toFixed(0)}% markup
                        </Typography>
                      )}
                      
                      {/* Stock information for inventory items */}
                      {material.current_stock !== undefined && (
                        <Box sx={{ mb: 1 }}>
                          <Typography 
                            variant="caption" 
                            color={material.isLowStock ? 'error' : 'text.secondary'}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            {material.isLowStock && (
                              <span style={{ color: '#f44336', fontSize: '10px' }}>⚠️</span>
                            )}
                            Stock: {material.current_stock} {material.unit}
                            {material.isLowStock && ' (Low)'}
                          </Typography>
                          {material.sku && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '9px' }}>
                              SKU: {material.sku}
                            </Typography>
                          )}
                        </Box>
                      )}
                      
                      {/* Quantity selector and add button */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={selectedMaterialQuantity[material.id] || 1}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1;
                            const maxQty = material.current_stock !== undefined ? material.current_stock : 999;
                            setSelectedMaterialQuantity(prev => ({
                              ...prev,
                              [material.id]: Math.max(1, Math.min(newQty, maxQty))
                            }));
                          }}
                          inputProps={{ 
                            min: 1, 
                            max: material.current_stock !== undefined ? material.current_stock : 999 
                          }}
                          sx={{ width: 60, '& .MuiInputBase-input': { fontSize: '0.875rem', py: 0.5 } }}
                          disabled={material.current_stock === 0}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => onAddMaterial(material)}
                          startIcon={<AddItemIcon sx={{ fontSize: '16px' }} />}
                          fullWidth
                          disabled={material.current_stock === 0}
                          color={material.isLowStock ? 'warning' : 'primary'}
                          sx={{ fontSize: '0.75rem', py: 0.5 }}
                        >
                          {material.current_stock === 0 ? 'Out of Stock' : 'Add'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          );
        })}
        
        {/* No results message */}
        {materialsCatalog.length === 0 && !inventoryLoading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No materials available from inventory
            </Typography>
          </Box>
        )}
        
        {materialSearchQuery && materialsCatalog.filter(item => 
          item.name.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(materialSearchQuery.toLowerCase())
        ).length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No materials match your search
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MaterialsCatalogSidebar;