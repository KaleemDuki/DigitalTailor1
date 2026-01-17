export enum OrderStatus {
  PENDING = 'Pending',
  STITCHING = 'In Stitching',
  READY = 'Ready',
  DELIVERED = 'Delivered'
}

export enum PaymentStatus {
  PAID = 'Paid',
  UNPAID = 'Unpaid'
}

export enum UserRole {
  TAILOR = 'Tailor',
  CUSTOMER = 'Customer'
}

export interface PaymentDetails {
  stitchingPrice: number;
  advancePaid: number;
  remainingAmount: number;
  status: PaymentStatus;
}

export interface Measurements {
  suitType: string;
  shoulder: string;
  chest: string;
  waist: string;
  neck: string;
  armLength: string;
  wrist: string;
  shirtLength: string;
  shalwarLength: string;
  paincha: string;
  damain: string;
  numPockets: number;
  numSuits: number;
  clothLengthGiven: string;
  measurementDate: string;
  deliveryDate: string;
  specialNotes: string;
}

export interface Message {
  id: string;
  urdu: string;
  english: string;
  timestamp: string;
}

export interface Order {
  id: string;
  customerId: string;
  measurements: Measurements;
  status: OrderStatus;
  payment: PaymentDetails;
  messages: Message[];
  photos?: string[]; // array of base64 image strings
}

export interface Customer {
  id: string;
  name: string;
  fatherName: string;
  address: string;
  cnic: string;
  mobileNumber: string;
  profilePicture?: string; // Added profile picture field
}

export interface AppState {
  customers: Customer[];
  orders: Order[];
  currentUser: {
    role: UserRole;
    id?: string; // For customer login
  } | null;
}