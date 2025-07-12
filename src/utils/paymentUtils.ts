// Payment utility functions and constants

export interface MinimumAmountInfo {
  amount: number;
  currency: string;
  symbol: string;
}

export const STRIPE_MINIMUM_AMOUNTS = {
  'inr': { amount: 50, symbol: '₹' },    // ₹50 (5000 paise)
  'usd': { amount: 0.50, symbol: '$' },  // $0.50 (50 cents)
  'eur': { amount: 0.50, symbol: '€' },  // €0.50 (50 cents)
  'gbp': { amount: 0.30, symbol: '£' }   // £0.30 (30 pence)
} as const;

export const getMinimumAmount = (currency: string = 'INR'): MinimumAmountInfo => {
  const currencyLower = currency.toLowerCase() as keyof typeof STRIPE_MINIMUM_AMOUNTS;
  const info = STRIPE_MINIMUM_AMOUNTS[currencyLower] || STRIPE_MINIMUM_AMOUNTS.inr;
  
  return {
    amount: info.amount,
    currency: currency.toUpperCase(),
    symbol: info.symbol
  };
};

export const isAmountAboveMinimum = (amount: number, currency: string = 'INR'): boolean => {
  const minimum = getMinimumAmount(currency);
  return amount >= minimum.amount;
};

export const formatMinimumAmountMessage = (
  currentAmount: number,
  currency: string = 'INR'
): string => {
  const minimum = getMinimumAmount(currency);
  return `Payment amount too low. Minimum: ${minimum.symbol}${minimum.amount}, Current: ${minimum.symbol}${currentAmount}`;
};

export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  const currencyInfo = getMinimumAmount(currency);
  
  if (currency.toUpperCase() === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  
  return `${currencyInfo.symbol}${amount.toLocaleString()}`;
};
