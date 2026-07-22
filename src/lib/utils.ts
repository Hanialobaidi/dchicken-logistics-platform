import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AR_SA_LATIN: Intl.NumberFormatOptions = { numberingSystem: 'latin' }

export function formatNum(n: number): string {
  return n.toLocaleString('ar-SA', AR_SA_LATIN)
}

export function formatPrice(n: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
    numberingSystem: 'latin',
  }).format(n)
}

export function formatPriceFull(n: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 2,
    numberingSystem: 'latin',
  }).format(n)
} 