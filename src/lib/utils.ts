import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US')

export function formatNum(n: number): string {
  return NUMBER_FORMATTER.format(n)
}

const PRICE_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'SAR',
  maximumFractionDigits: 0,
})

export function formatPrice(n: number): string {
  return PRICE_FORMATTER.format(n)
}

const PRICE_FULL_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'SAR',
  maximumFractionDigits: 2,
})

export function formatPriceFull(n: number): string {
  return PRICE_FULL_FORMATTER.format(n)
} 