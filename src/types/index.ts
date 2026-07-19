export interface Restaurant {
  id: string
  name: string
  location: string
  phone: string
  taxNumber: string
  createdAt: string
  ownerId: string
}

export const CHICKEN_TYPES = ['شاورما مبرد (فريش)', 'أخرى'] as const

export interface Trip {
  id: string
  driverId: string
  driverName: string
  status: 'pending' | 'in_progress' | 'completed'
  totalWeight: number
  tripDate: string
  createdAt: string
  ownerId: string
}

export interface TripRestaurant {
  id: string
  tripId: string
  restaurantId: string
  restaurantName: string
  targetWeight: number
  actualWeight: number | null
  status: 'pending' | 'delivered' | 'cancelled'
  invoiceImageUrl: string | null
  notes: string | null
  deliveredAt: string | null
  createdAt: string
  pricePerKg: number
  paymentMethod: string
  totalPrice: number
  chickenType: string
}

export interface Driver {
  id: string
  name: string
  phone: string
  plateNumber: string
  username: string
  password: string
  createdAt: string
  ownerId: string
}

export interface Purchase {
  id: string
  purchaseDate: string
  farmName: string
  quantityKg: number
  pricePerKg: number
  totalCost: number
  notes: string | null
  ownerId: string
  createdAt: string
  chickenType: string
}

export interface DirectOrder {
  id: string
  driverId: string
  driverName: string
  orderDate: string
  restaurantName: string
  actualWeight: number
  invoiceImageUrl: string | null
  notes: string | null
  status: 'pending' | 'delivered'
  ownerId: string
  createdAt: string
  pricePerKg: number
  paymentMethod: string
  totalPrice: number
  restaurantTaxNumber: string
  chickenType: string
  paymentStatus: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  orderId: string
  orderType: string
  restaurantName: string
  restaurantTaxNumber: string
  driverName: string
  driverId: string
  itemDescription: string
  quantityKg: number
  pricePerKg: number
  subtotalBeforeTax: number
  vatAmount: number
  totalAmount: number
  paymentMethod: string
  invoiceDate: string
  pdfUrl: string | null
  ownerId: string
  createdAt: string
  chickenType: string
  paymentStatus: string
}

export type UserRole = 'admin' | 'driver' | null

export interface DriverSession {
  driverId: string
  driverName: string
  username: string
}
