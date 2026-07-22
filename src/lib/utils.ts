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

const DATE_SHORT = new Intl.DateTimeFormat('en-GB', {
  calendar: 'gregory',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})

const DATE_LONG = new Intl.DateTimeFormat('ar-SA', {
  calendar: 'gregory',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function toLatin(str: string): string {
  return str.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

export function formatDate(d: string | Date): string {
  return toLatin(DATE_SHORT.format(typeof d === 'string' ? new Date(d + 'T00:00:00') : d))
}

export function formatDateLong(d: string | Date): string {
  return toLatin(DATE_LONG.format(typeof d === 'string' ? new Date(d + 'T00:00:00') : d))
} 