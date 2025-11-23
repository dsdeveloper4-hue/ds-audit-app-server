// shared/calculateTotalValue.ts
// Shared calculation function for total value to ensure consistency between Dashboard and Adjusted Report

export interface ItemDetail {
  active_quantity: number;
  broken_quantity: number;
  inactive_quantity: number;
  lost_quantity?: number;
  total_price: number;
  item?: {
    name: string;
  };
}

/**
 * Calculate total asset value using simple SUM approach
 * This function ensures both Dashboard and Adjusted Report use: SUM(item_details.total_price)
 */
export function calculateTotalAssetValue(itemDetails: ItemDetail[]): number {
  if (!itemDetails || itemDetails.length === 0) {
    return 0;
  }

  // Simple SUM of all total_price values - this is the requirement
  let totalValue = 0;
  itemDetails.forEach((detail) => {
    totalValue += Number(detail.total_price) || 0;
  });

  return Math.round(totalValue * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate adjusted asset value with reduction percentage
 * Used specifically for Adjusted Report calculations
 * Formula: adjusted_value = total_assets * (1 - (reduction_percentage / 100))
 */
export function calculateAdjustedAssetValue(
  itemDetails: ItemDetail[],
  reductionPercentage: number = 0
): {
  totalAssetValue: number;
  adjustedAssetValue: number;
  reductionAmount: number;
} {
  if (!itemDetails || itemDetails.length === 0) {
    return {
      totalAssetValue: 0,
      adjustedAssetValue: 0,
      reductionAmount: 0,
    };
  }

  // Use the same base calculation as Dashboard: SUM(item_details.total_price)
  const totalAssets = calculateTotalAssetValue(itemDetails);

  // Apply reduction percentage using the correct formula
  // adjusted_value = total_assets * (1 - (reduction_percentage / 100))
  const reductionFactor = Number(reductionPercentage) / 100;
  const adjustedValue = totalAssets * (1 - reductionFactor);
  const reductionAmount = totalAssets * reductionFactor;

  return {
    totalAssetValue: Math.round(totalAssets * 100) / 100,
    adjustedAssetValue: Math.round(adjustedValue * 100) / 100,
    reductionAmount: Math.round(reductionAmount * 100) / 100,
  };
}
