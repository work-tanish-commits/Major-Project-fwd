/**
 * Blood Bridge - Core LocalStorage Database & State Management
 * File: storage.js
 */

const STORAGE_KEYS = {
  HOSPITALS: 'blood_bridge_hospitals',
  PATIENTS: 'blood_bridge_patients',
  REQUESTS: 'blood_bridge_requests',
  CURRENT_USER: 'blood_bridge_current_user'
};

// Blood Groups and Components Definition
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const BLOOD_COMPONENTS = ['Whole Blood', 'Plasma', 'RBC', 'WBC'];

// Blood Compatibility Matrix for Red Blood Cells / Whole Blood
const RBC_COMPATIBILITY = {
  'A+': { canReceiveFrom: ['A+', 'A-', 'O+', 'O-'], canDonateTo: ['A+', 'AB+'] },
  'A-': { canReceiveFrom: ['A-', 'O-'], canDonateTo: ['A+', 'A-', 'AB+', 'AB-'] },
  'B+': { canReceiveFrom: ['B+', 'B-', 'O+', 'O-'], canDonateTo: ['B+', 'AB+'] },
  'B-': { canReceiveFrom: ['B-', 'O-'], canDonateTo: ['B+', 'B-', 'AB+', 'AB-'] },
  'AB+': { canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], canDonateTo: ['AB+'] }, // Universal Recipient
  'AB-': { canReceiveFrom: ['AB-', 'A-', 'B-', 'O-'], canDonateTo: ['AB+', 'AB-'] },
  'O+': { canReceiveFrom: ['O+', 'O-'], canDonateTo: ['O+', 'A+', 'B+', 'AB+'] },
  'O-': { canReceiveFrom: ['O-'], canDonateTo: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] } // Universal Donor
};

// Initial Seed Hospitals Data
const DUMMY_HOSPITALS = [
  {
    id: 'hosp_1',
    name: 'AIIMS Blood Bank',
    licenseId: 'LIC-DL-2024-101',
    city: 'South Delhi',
    address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi - 110029',
    phone: '+91-11-2658-8500',
    email: 'bloodbank@aiims.edu',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 mins ago
    inventory: {
      'Whole Blood': { 'A+': 16, 'A-': 5, 'B+': 18, 'B-': 3, 'O+': 22, 'O-': 6, 'AB+': 8, 'AB-': 2 },
      'Plasma': { 'A+': 12, 'A-': 4, 'B+': 14, 'B-': 2, 'O+': 19, 'O-': 4, 'AB+': 11, 'AB-': 1 },
      'RBC': { 'A+': 15, 'A-': 6, 'B+': 12, 'B-': 4, 'O+': 25, 'O-': 5, 'AB+': 7, 'AB-': 2 },
      'WBC': { 'A+': 8, 'A-': 2, 'B+': 9, 'B-': 1, 'O+': 10, 'O-': 3, 'AB+': 4, 'AB-': 1 }
    }
  },
  {
    id: 'hosp_2',
    name: 'Rotary Blood Bank',
    licenseId: 'LIC-DL-2023-402',
    city: 'Central Delhi',
    address: '56-57 Tughlakabad Institutional Area, Near Badarpur, New Delhi - 110062',
    phone: '+91-11-2994-6206',
    email: 'info@rotarybloodbank.org',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 70).toISOString(), // ~1 hr ago
    inventory: {
      'Whole Blood': { 'A+': 28, 'A-': 12, 'B+': 32, 'B-': 8, 'O+': 45, 'O-': 14, 'AB+': 15, 'AB-': 5 },
      'Plasma': { 'A+': 20, 'A-': 8, 'B+': 24, 'B-': 6, 'O+': 30, 'O-': 9, 'AB+': 18, 'AB-': 4 },
      'RBC': { 'A+': 25, 'A-': 10, 'B+': 22, 'B-': 7, 'O+': 38, 'O-': 11, 'AB+': 12, 'AB-': 3 },
      'WBC': { 'A+': 14, 'A-': 5, 'B+': 12, 'B-': 3, 'O+': 16, 'O-': 6, 'AB+': 8, 'AB-': 2 }
    }
  },
  {
    id: 'hosp_3',
    name: 'Fortis Hospital Blood Bank',
    licenseId: 'LIC-HR-2025-993',
    city: 'Gurugram',
    address: 'Sector 44, Gurugram, Haryana - 122002',
    phone: '+91-124-492-1021',
    email: 'bloodbank@fortishealthcare.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 8, 'A-': 2, 'B+': 6, 'B-': 1, 'O+': 11, 'O-': 2, 'AB+': 4, 'AB-': 0 },
      'Plasma': { 'A+': 6, 'A-': 1, 'B+': 5, 'B-': 1, 'O+': 9, 'O-': 1, 'AB+': 3, 'AB-': 0 },
      'RBC': { 'A+': 9, 'A-': 3, 'B+': 7, 'B-': 2, 'O+': 14, 'O-': 1, 'AB+': 5, 'AB-': 1 },
      'WBC': { 'A+': 4, 'A-': 0, 'B+': 3, 'B-': 0, 'O+': 5, 'O-': 1, 'AB+': 2, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_4',
    name: 'Yatharth Super Speciality Hospital',
    licenseId: 'LIC-UP-2022-771',
    city: 'Noida',
    address: 'Plot No. 01, Sector 110, Noida, Uttar Pradesh - 201304',
    phone: '+91-120-461-0000',
    email: 'bloodbank@yatharthhospital.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 14, 'A-': 4, 'B+': 16, 'B-': 5, 'O+': 18, 'O-': 4, 'AB+': 9, 'AB-': 3 },
      'Plasma': { 'A+': 10, 'A-': 3, 'B+': 12, 'B-': 4, 'O+': 15, 'O-': 3, 'AB+': 8, 'AB-': 2 },
      'RBC': { 'A+': 12, 'A-': 5, 'B+': 14, 'B-': 3, 'O+': 20, 'O-': 4, 'AB+': 6, 'AB-': 2 },
      'WBC': { 'A+': 6, 'A-': 2, 'B+': 7, 'B-': 2, 'O+': 8, 'O-': 2, 'AB+': 4, 'AB-': 1 }
    }
  },
  {
    id: 'hosp_5',
    name: 'Max Super Speciality Hospital',
    licenseId: 'LIC-DL-2024-515',
    city: 'Dwarka',
    address: '2, Press Enclave Road, Saket, New Delhi - 110017',
    phone: '+91-11-2651-5050',
    email: 'bloodbank@maxhealthcare.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 mins ago
    inventory: {
      'Whole Blood': { 'A+': 11, 'A-': 3, 'B+': 13, 'B-': 2, 'O+': 17, 'O-': 3, 'AB+': 6, 'AB-': 1 },
      'Plasma': { 'A+': 8, 'A-': 2, 'B+': 9, 'B-': 2, 'O+': 12, 'O-': 2, 'AB+': 5, 'AB-': 1 },
      'RBC': { 'A+': 10, 'A-': 4, 'B+': 11, 'B-': 2, 'O+': 16, 'O-': 3, 'AB+': 4, 'AB-': 1 },
      'WBC': { 'A+': 5, 'A-': 1, 'B+': 6, 'B-': 1, 'O+': 7, 'O-': 1, 'AB+': 3, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_6',
    name: 'Safdarjung Hospital Blood Bank',
    licenseId: 'LIC-DL-2023-612',
    city: 'South Delhi',
    address: 'Ring Road, Safdarjung Hospital, New Delhi - 110029',
    phone: '+91-11-2616-4033',
    email: 'bloodbank@safdarjunghospital.nic.in',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    inventory: {
      'Whole Blood': { 'A+': 20, 'A-': 7, 'B+': 22, 'B-': 5, 'O+': 30, 'O-': 9, 'AB+': 10, 'AB-': 3 },
      'Plasma': { 'A+': 15, 'A-': 5, 'B+': 18, 'B-': 4, 'O+': 22, 'O-': 6, 'AB+': 12, 'AB-': 2 },
      'RBC': { 'A+': 18, 'A-': 7, 'B+': 16, 'B-': 5, 'O+': 28, 'O-': 8, 'AB+': 9, 'AB-': 2 },
      'WBC': { 'A+': 10, 'A-': 3, 'B+': 8, 'B-': 2, 'O+': 12, 'O-': 4, 'AB+': 5, 'AB-': 1 }
    }
  },
  {
    id: 'hosp_7',
    name: 'Medanta - The Medicity',
    licenseId: 'LIC-HR-2024-789',
    city: 'Gurugram',
    address: 'CH Baktawar Singh Road, Sector 38, Gurugram, Haryana - 122001',
    phone: '+91-124-414-1414',
    email: 'bloodbank@medanta.org',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 18, 'A-': 6, 'B+': 20, 'B-': 4, 'O+': 25, 'O-': 8, 'AB+': 11, 'AB-': 3 },
      'Plasma': { 'A+': 14, 'A-': 5, 'B+': 16, 'B-': 3, 'O+': 20, 'O-': 5, 'AB+': 10, 'AB-': 2 },
      'RBC': { 'A+': 16, 'A-': 6, 'B+': 14, 'B-': 4, 'O+': 22, 'O-': 7, 'AB+': 8, 'AB-': 2 },
      'WBC': { 'A+': 9, 'A-': 3, 'B+': 7, 'B-': 2, 'O+': 11, 'O-': 3, 'AB+': 5, 'AB-': 1 }
    }
  },
  {
    id: 'hosp_8',
    name: 'Jaypee Hospital Blood Bank',
    licenseId: 'LIC-UP-2024-888',
    city: 'Noida',
    address: 'Sector 128, Noida Expressway, Noida, Uttar Pradesh - 201304',
    phone: '+91-120-412-2222',
    email: 'bloodbank@jaypeehospital.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 150).toISOString(), // 2.5 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 12, 'A-': 3, 'B+': 14, 'B-': 3, 'O+': 16, 'O-': 4, 'AB+': 7, 'AB-': 2 },
      'Plasma': { 'A+': 9, 'A-': 2, 'B+': 10, 'B-': 2, 'O+': 13, 'O-': 3, 'AB+': 6, 'AB-': 1 },
      'RBC': { 'A+': 11, 'A-': 4, 'B+': 12, 'B-': 3, 'O+': 18, 'O-': 4, 'AB+': 5, 'AB-': 1 },
      'WBC': { 'A+': 5, 'A-': 1, 'B+': 5, 'B-': 1, 'O+': 7, 'O-': 2, 'AB+': 3, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_9',
    name: 'GTB Hospital Blood Bank',
    licenseId: 'LIC-DL-2023-909',
    city: 'East Delhi',
    address: 'Dilshad Garden, University Road, Delhi - 110095',
    phone: '+91-11-2258-9100',
    email: 'bloodbank@gtbhospital.in',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hr ago
    inventory: {
      'Whole Blood': { 'A+': 15, 'A-': 4, 'B+': 17, 'B-': 4, 'O+': 20, 'O-': 5, 'AB+': 8, 'AB-': 2 },
      'Plasma': { 'A+': 11, 'A-': 3, 'B+': 13, 'B-': 3, 'O+': 17, 'O-': 4, 'AB+': 7, 'AB-': 1 },
      'RBC': { 'A+': 13, 'A-': 5, 'B+': 11, 'B-': 3, 'O+': 19, 'O-': 5, 'AB+': 6, 'AB-': 2 },
      'WBC': { 'A+': 7, 'A-': 2, 'B+': 6, 'B-': 1, 'O+': 9, 'O-': 2, 'AB+': 4, 'AB-': 1 }
    }
  },
  {
    id: 'hosp_10',
    name: 'Venkateshwar Hospital Blood Bank',
    licenseId: 'LIC-DL-2024-110',
    city: 'Dwarka',
    address: 'Sector 18A, Dwarka, New Delhi - 110075',
    phone: '+91-11-4255-5555',
    email: 'bloodbank@venkateshwarhospital.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 mins ago
    inventory: {
      'Whole Blood': { 'A+': 10, 'A-': 3, 'B+': 12, 'B-': 2, 'O+': 15, 'O-': 3, 'AB+': 5, 'AB-': 1 },
      'Plasma': { 'A+': 7, 'A-': 2, 'B+': 8, 'B-': 1, 'O+': 11, 'O-': 2, 'AB+': 4, 'AB-': 1 },
      'RBC': { 'A+': 9, 'A-': 3, 'B+': 10, 'B-': 2, 'O+': 14, 'O-': 3, 'AB+': 4, 'AB-': 1 },
      'WBC': { 'A+': 4, 'A-': 1, 'B+': 5, 'B-': 1, 'O+': 6, 'O-': 1, 'AB+': 2, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_11',
    name: 'Felix Hospital',
    licenseId: 'LIC-UP-2025-111',
    city: 'Greater Noida',
    address: 'NH-1, Sector Omega-1, Greater Noida, Uttar Pradesh - 201310',
    phone: '+91-120-226-6666',
    email: 'bloodbank@felixhospital.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 200).toISOString(), // ~3.3 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 9, 'A-': 2, 'B+': 10, 'B-': 2, 'O+': 13, 'O-': 3, 'AB+': 5, 'AB-': 1 },
      'Plasma': { 'A+': 6, 'A-': 1, 'B+': 7, 'B-': 1, 'O+': 10, 'O-': 2, 'AB+': 4, 'AB-': 0 },
      'RBC': { 'A+': 8, 'A-': 3, 'B+': 9, 'B-': 2, 'O+': 12, 'O-': 2, 'AB+': 3, 'AB-': 1 },
      'WBC': { 'A+': 3, 'A-': 1, 'B+': 4, 'B-': 0, 'O+': 5, 'O-': 1, 'AB+': 2, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_12',
    name: 'Lok Nayak Jai Prakash Hospital',
    licenseId: 'LIC-DL-2023-120',
    city: 'Central Delhi',
    address: 'Jawaharlal Nehru Marg, Delhi Gate, New Delhi - 110002',
    phone: '+91-11-2323-2400',
    email: 'bloodbank@lnjphospital.in',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    inventory: {
      'Whole Blood': { 'A+': 22, 'A-': 8, 'B+': 25, 'B-': 6, 'O+': 35, 'O-': 10, 'AB+': 12, 'AB-': 4 },
      'Plasma': { 'A+': 16, 'A-': 6, 'B+': 19, 'B-': 5, 'O+': 25, 'O-': 7, 'AB+': 14, 'AB-': 3 },
      'RBC': { 'A+': 20, 'A-': 8, 'B+': 18, 'B-': 5, 'O+': 30, 'O-': 9, 'AB+': 10, 'AB-': 3 },
      'WBC': { 'A+': 11, 'A-': 4, 'B+': 10, 'B-': 2, 'O+': 14, 'O-': 5, 'AB+': 6, 'AB-': 1 }
    }
  },
  {
    id: 'hosp_13',
    name: 'BLK-Max Super Speciality Hospital',
    licenseId: 'LIC-DL-2024-130',
    city: 'North Delhi',
    address: 'Pusa Road, Rajinder Nagar, New Delhi - 110005',
    phone: '+91-11-3040-3040',
    email: 'bloodbank@blkmaxhospital.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 100).toISOString(), // ~1.6 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 17, 'A-': 5, 'B+': 19, 'B-': 4, 'O+': 24, 'O-': 7, 'AB+': 9, 'AB-': 2 },
      'Plasma': { 'A+': 13, 'A-': 4, 'B+': 15, 'B-': 3, 'O+': 18, 'O-': 5, 'AB+': 8, 'AB-': 2 },
      'RBC': { 'A+': 14, 'A-': 5, 'B+': 13, 'B-': 4, 'O+': 21, 'O-': 6, 'AB+': 7, 'AB-': 2 },
      'WBC': { 'A+': 8, 'A-': 2, 'B+': 7, 'B-': 1, 'O+': 10, 'O-': 3, 'AB+': 4, 'AB-': 1 }
    }
  },
  {
    id: 'hosp_14',
    name: 'Kailash Hospital & Heart Institute',
    licenseId: 'LIC-UP-2023-140',
    city: 'Greater Noida',
    address: 'Sector 27, Noida, Uttar Pradesh - 201301',
    phone: '+91-120-250-0100',
    email: 'bloodbank@kailashhospital.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 13, 'A-': 4, 'B+': 15, 'B-': 3, 'O+': 19, 'O-': 5, 'AB+': 7, 'AB-': 2 },
      'Plasma': { 'A+': 10, 'A-': 3, 'B+': 11, 'B-': 2, 'O+': 14, 'O-': 3, 'AB+': 6, 'AB-': 1 },
      'RBC': { 'A+': 11, 'A-': 4, 'B+': 13, 'B-': 3, 'O+': 17, 'O-': 4, 'AB+': 5, 'AB-': 1 },
      'WBC': { 'A+': 5, 'A-': 1, 'B+': 6, 'B-': 1, 'O+': 8, 'O-': 2, 'AB+': 3, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_15',
    name: 'Artemis Hospital',
    licenseId: 'LIC-HR-2024-150',
    city: 'Gurugram',
    address: 'Sector 51, Gurugram, Haryana - 122001',
    phone: '+91-124-676-7000',
    email: 'bloodbank@artemishospitals.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 55).toISOString(), // 55 mins ago
    inventory: {
      'Whole Blood': { 'A+': 14, 'A-': 4, 'B+': 16, 'B-': 3, 'O+': 20, 'O-': 5, 'AB+': 8, 'AB-': 2 },
      'Plasma': { 'A+': 11, 'A-': 3, 'B+': 12, 'B-': 2, 'O+': 16, 'O-': 4, 'AB+': 7, 'AB-': 1 },
      'RBC': { 'A+': 12, 'A-': 5, 'B+': 11, 'B-': 3, 'O+': 18, 'O-': 5, 'AB+': 6, 'AB-': 2 },
      'WBC': { 'A+': 6, 'A-': 2, 'B+': 5, 'B-': 1, 'O+': 9, 'O-': 2, 'AB+': 3, 'AB-': 1 }
    }
  },
  {
    id: 'hosp_16',
    name: 'Manipal Hospital',
    licenseId: 'LIC-DL-2024-160',
    city: 'Dwarka',
    address: 'Sector 6, Palam Vihar, Dwarka, New Delhi - 110075',
    phone: '+91-11-4567-7777',
    email: 'bloodbank@manipalhospitals.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 80).toISOString(), // ~1.3 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 11, 'A-': 3, 'B+': 13, 'B-': 2, 'O+': 16, 'O-': 4, 'AB+': 6, 'AB-': 1 },
      'Plasma': { 'A+': 8, 'A-': 2, 'B+': 9, 'B-': 2, 'O+': 12, 'O-': 3, 'AB+': 5, 'AB-': 1 },
      'RBC': { 'A+': 10, 'A-': 3, 'B+': 11, 'B-': 2, 'O+': 15, 'O-': 3, 'AB+': 4, 'AB-': 1 },
      'WBC': { 'A+': 5, 'A-': 1, 'B+': 5, 'B-': 1, 'O+': 7, 'O-': 2, 'AB+': 3, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_17',
    name: 'Sharda Hospital',
    licenseId: 'LIC-UP-2025-170',
    city: 'Greater Noida',
    address: 'Knowledge Park III, Greater Noida, Uttar Pradesh - 201310',
    phone: '+91-120-414-1400',
    email: 'bloodbank@shardahospital.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 7, 'A-': 2, 'B+': 9, 'B-': 1, 'O+': 12, 'O-': 2, 'AB+': 4, 'AB-': 1 },
      'Plasma': { 'A+': 5, 'A-': 1, 'B+': 6, 'B-': 1, 'O+': 8, 'O-': 1, 'AB+': 3, 'AB-': 0 },
      'RBC': { 'A+': 7, 'A-': 2, 'B+': 8, 'B-': 1, 'O+': 10, 'O-': 2, 'AB+': 3, 'AB-': 0 },
      'WBC': { 'A+': 3, 'A-': 0, 'B+': 3, 'B-': 0, 'O+': 4, 'O-': 1, 'AB+': 1, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_18',
    name: 'Sir Ganga Ram Hospital Blood Bank',
    licenseId: 'LIC-DL-2023-180',
    city: 'North Delhi',
    address: 'Rajinder Nagar, New Delhi - 110060',
    phone: '+91-11-2586-1250',
    email: 'bloodbank@sgrh.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 mins ago
    inventory: {
      'Whole Blood': { 'A+': 19, 'A-': 6, 'B+': 21, 'B-': 5, 'O+': 27, 'O-': 8, 'AB+': 10, 'AB-': 3 },
      'Plasma': { 'A+': 14, 'A-': 5, 'B+': 16, 'B-': 4, 'O+': 20, 'O-': 6, 'AB+': 9, 'AB-': 2 },
      'RBC': { 'A+': 17, 'A-': 6, 'B+': 15, 'B-': 4, 'O+': 24, 'O-': 7, 'AB+': 8, 'AB-': 2 },
      'WBC': { 'A+': 9, 'A-': 3, 'B+': 8, 'B-': 2, 'O+': 12, 'O-': 3, 'AB+': 5, 'AB-': 1 }
    }
  },
  {
    id: 'hosp_19',
    name: 'Dharamshila Narayana Hospital',
    licenseId: 'LIC-DL-2024-190',
    city: 'East Delhi',
    address: 'Dharamshila Marg, Vasundhara Enclave, New Delhi - 110096',
    phone: '+91-11-4712-2222',
    email: 'bloodbank@dharamshila.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 110).toISOString(), // ~1.8 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 13, 'A-': 4, 'B+': 15, 'B-': 3, 'O+': 18, 'O-': 5, 'AB+': 7, 'AB-': 2 },
      'Plasma': { 'A+': 10, 'A-': 3, 'B+': 11, 'B-': 2, 'O+': 14, 'O-': 3, 'AB+': 6, 'AB-': 1 },
      'RBC': { 'A+': 11, 'A-': 4, 'B+': 13, 'B-': 3, 'O+': 17, 'O-': 4, 'AB+': 5, 'AB-': 1 },
      'WBC': { 'A+': 6, 'A-': 2, 'B+': 6, 'B-': 1, 'O+': 8, 'O-': 2, 'AB+': 3, 'AB-': 1 }
    }
  },
  {
    id: 'hosp_20',
    name: 'Paras Hospital',
    licenseId: 'LIC-HR-2024-200',
    city: 'Faridabad',
    address: 'C-1, Sector 12, Faridabad, Haryana - 121007',
    phone: '+91-129-437-5000',
    email: 'bloodbank@parashospitals.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 160).toISOString(), // ~2.6 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 10, 'A-': 3, 'B+': 11, 'B-': 2, 'O+': 14, 'O-': 3, 'AB+': 5, 'AB-': 1 },
      'Plasma': { 'A+': 7, 'A-': 2, 'B+': 8, 'B-': 1, 'O+': 10, 'O-': 2, 'AB+': 4, 'AB-': 1 },
      'RBC': { 'A+': 9, 'A-': 3, 'B+': 9, 'B-': 2, 'O+': 13, 'O-': 3, 'AB+': 4, 'AB-': 1 },
      'WBC': { 'A+': 4, 'A-': 1, 'B+': 4, 'B-': 1, 'O+': 6, 'O-': 1, 'AB+': 2, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_21',
    name: 'Metro Hospital & Heart Institute',
    licenseId: 'LIC-UP-2024-210',
    city: 'Noida',
    address: 'Sector 11, Noida, Uttar Pradesh - 201301',
    phone: '+91-120-425-7555',
    email: 'bloodbank@metrohospitalnoida.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 75).toISOString(), // ~1.25 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 12, 'A-': 3, 'B+': 14, 'B-': 3, 'O+': 17, 'O-': 4, 'AB+': 6, 'AB-': 2 },
      'Plasma': { 'A+': 9, 'A-': 2, 'B+': 10, 'B-': 2, 'O+': 13, 'O-': 3, 'AB+': 5, 'AB-': 1 },
      'RBC': { 'A+': 10, 'A-': 4, 'B+': 12, 'B-': 2, 'O+': 16, 'O-': 4, 'AB+': 5, 'AB-': 1 },
      'WBC': { 'A+': 5, 'A-': 1, 'B+': 5, 'B-': 1, 'O+': 7, 'O-': 2, 'AB+': 3, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_22',
    name: 'Asian Hospital',
    licenseId: 'LIC-HR-2023-220',
    city: 'Faridabad',
    address: 'Sector 21A, Faridabad, Haryana - 121001',
    phone: '+91-129-258-8888',
    email: 'bloodbank@asianhospital.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 140).toISOString(), // ~2.3 hrs ago
    inventory: {
      'Whole Blood': { 'A+': 11, 'A-': 3, 'B+': 12, 'B-': 2, 'O+': 15, 'O-': 4, 'AB+': 6, 'AB-': 1 },
      'Plasma': { 'A+': 8, 'A-': 2, 'B+': 9, 'B-': 2, 'O+': 11, 'O-': 2, 'AB+': 5, 'AB-': 1 },
      'RBC': { 'A+': 10, 'A-': 3, 'B+': 10, 'B-': 2, 'O+': 14, 'O-': 3, 'AB+': 4, 'AB-': 1 },
      'WBC': { 'A+': 5, 'A-': 1, 'B+': 5, 'B-': 1, 'O+': 6, 'O-': 2, 'AB+': 2, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_23',
    name: 'Indian Red Cross Blood Bank',
    licenseId: 'LIC-DL-2022-230',
    city: 'Central Delhi',
    address: '1, Red Cross Road, New Delhi - 110001',
    phone: '+91-11-2371-6441',
    email: 'bloodbank@indianredcross.org',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    inventory: {
      'Whole Blood': { 'A+': 30, 'A-': 10, 'B+': 35, 'B-': 8, 'O+': 42, 'O-': 12, 'AB+': 14, 'AB-': 4 },
      'Plasma': { 'A+': 22, 'A-': 7, 'B+': 25, 'B-': 6, 'O+': 32, 'O-': 8, 'AB+': 16, 'AB-': 3 },
      'RBC': { 'A+': 26, 'A-': 9, 'B+': 24, 'B-': 6, 'O+': 36, 'O-': 10, 'AB+': 11, 'AB-': 3 },
      'WBC': { 'A+': 13, 'A-': 4, 'B+': 11, 'B-': 3, 'O+': 15, 'O-': 5, 'AB+': 7, 'AB-': 2 }
    }
  },
  {
    id: 'hosp_24',
    name: 'Columbia Asia Hospital',
    licenseId: 'LIC-HR-2024-240',
    city: 'Gurugram',
    address: 'NH 8, Sector 26, Palam Vihar, Gurugram, Haryana - 122017',
    phone: '+91-124-398-9898',
    email: 'bloodbank@columbiaasia.com',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 50).toISOString(), // 50 mins ago
    inventory: {
      'Whole Blood': { 'A+': 9, 'A-': 2, 'B+': 11, 'B-': 2, 'O+': 13, 'O-': 3, 'AB+': 5, 'AB-': 1 },
      'Plasma': { 'A+': 7, 'A-': 2, 'B+': 8, 'B-': 1, 'O+': 10, 'O-': 2, 'AB+': 4, 'AB-': 1 },
      'RBC': { 'A+': 8, 'A-': 3, 'B+': 9, 'B-': 2, 'O+': 12, 'O-': 3, 'AB+': 3, 'AB-': 1 },
      'WBC': { 'A+': 4, 'A-': 1, 'B+': 4, 'B-': 0, 'O+': 5, 'O-': 1, 'AB+': 2, 'AB-': 0 }
    }
  },
  {
    id: 'hosp_25',
    name: 'Rajiv Gandhi Cancer Institute',
    licenseId: 'LIC-DL-2024-250',
    city: 'North Delhi',
    address: 'Sector 5, Rohini, New Delhi - 110085',
    phone: '+91-11-4702-2702',
    email: 'bloodbank@rgcirc.org',
    password: 'hospital123',
    role: 'hospital',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 65).toISOString(), // ~1 hr ago
    inventory: {
      'Whole Blood': { 'A+': 15, 'A-': 5, 'B+': 17, 'B-': 4, 'O+': 21, 'O-': 6, 'AB+': 8, 'AB-': 2 },
      'Plasma': { 'A+': 11, 'A-': 4, 'B+': 13, 'B-': 3, 'O+': 16, 'O-': 4, 'AB+': 7, 'AB-': 2 },
      'RBC': { 'A+': 14, 'A-': 5, 'B+': 12, 'B-': 3, 'O+': 19, 'O-': 5, 'AB+': 6, 'AB-': 2 },
      'WBC': { 'A+': 7, 'A-': 2, 'B+': 6, 'B-': 1, 'O+': 9, 'O-': 2, 'AB+': 4, 'AB-': 1 }
    }
  }
];

// Initial Seed Patients Data
const DUMMY_PATIENTS = [
  {
    id: 'pat_1',
    name: 'Rahul Sharma',
    phone: '+91-98765-43210',
    bloodGroup: 'A+',
    city: 'South Delhi',
    email: 'rahul.sharma@gmail.com',
    password: 'patient123',
    role: 'patient',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'pat_2',
    name: 'Priya Verma',
    phone: '+91-98123-45678',
    bloodGroup: 'O-',
    city: 'Noida',
    email: 'priya.verma@gmail.com',
    password: 'patient123',
    role: 'patient',
    createdAt: '2026-02-14T11:30:00Z'
  },
  {
    id: 'pat_3',
    name: 'Rahul Sharma',
    phone: '+91-98765-43210',
    bloodGroup: 'A+',
    city: 'South Delhi',
    email: 'sarah@gmail.com',
    password: 'patient123',
    role: 'patient',
    createdAt: '2026-01-10T08:00:00Z'
  }
];

// Initial Seed Requests Data
const DUMMY_REQUESTS = [
  {
    id: 'req_101',
    hospitalId: 'hosp_1',
    hospitalName: 'AIIMS Blood Bank',
    patientName: 'Kavita Sundaram',
    patientPhone: '+91-98765-00112',
    patientEmail: 'kavita.s@example.com',
    bloodGroup: 'O-',
    component: 'Whole Blood',
    units: 2,
    urgency: 'Critical Emergency',
    notes: 'Severe trauma admission in OT-2. Immediate crossmatch needed.',
    status: 'Pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString() // 40 mins ago
  },
  {
    id: 'req_102',
    hospitalId: 'hosp_1',
    hospitalName: 'AIIMS Blood Bank',
    patientName: 'Devendra Rao',
    patientPhone: '+91-99887-76655',
    patientEmail: 'devendra@example.com',
    bloodGroup: 'B+',
    component: 'Plasma',
    units: 1,
    urgency: 'Urgent',
    notes: 'Liver dysfunction with coagulopathy. Fresh Frozen Plasma requested.',
    status: 'Pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString() // 1.5 hrs ago
  },
  {
    id: 'req_103',
    hospitalId: 'hosp_2',
    hospitalName: 'Rotary Blood Bank',
    patientName: 'Ananya Sharma',
    patientPhone: '+91-98441-22334',
    patientEmail: 'ananya.sh@example.com',
    bloodGroup: 'A+',
    component: 'RBC',
    units: 2,
    urgency: 'Standard',
    notes: 'Elective orthopedic surgery scheduled for tomorrow morning.',
    status: 'Approved',
    approvedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString()
  }
];

const DB_VERSION = 'v2_delhi_ncr_indian';

// Database Storage Controller
const StorageDB = {
  // Initialize simulated database in localStorage
  init() {
    const currentVersion = localStorage.getItem('blood_bridge_db_version');
    if (currentVersion !== DB_VERSION) {
      this.setHospitals(DUMMY_HOSPITALS);
      this.setPatients(DUMMY_PATIENTS);
      this.setRequests(DUMMY_REQUESTS);
      localStorage.setItem('blood_bridge_db_version', DB_VERSION);
      return;
    }

    if (!localStorage.getItem(STORAGE_KEYS.HOSPITALS)) {
      this.setHospitals(DUMMY_HOSPITALS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
      this.setPatients(DUMMY_PATIENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.REQUESTS)) {
      this.setRequests(DUMMY_REQUESTS);
    }
  },

  // Reset database back to seed data
  resetDatabase() {
    this.setHospitals(DUMMY_HOSPITALS);
    this.setPatients(DUMMY_PATIENTS);
    this.setRequests(DUMMY_REQUESTS);
    localStorage.setItem('blood_bridge_db_version', DB_VERSION);
    this.showToast('Database reset to initial sample hospitals and stock.', 'info');
  },

  // Hospital operations
  getHospitals() {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HOSPITALS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error parsing hospitals from localStorage:', e);
      return [];
    }
  },

  setHospitals(hospitals) {
    localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(hospitals));
  },

  getHospitalById(id) {
    const list = this.getHospitals();
    return list.find(h => h.id === id) || null;
  },

  getHospitalByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const list = this.getHospitals();
    let hospital = list.find(h => h.email && h.email.trim().toLowerCase() === cleanEmail);
    if (!hospital) {
      if (cleanEmail === 'citycare@hospital.org') {
        return list.find(h => h.id === 'hosp_1') || DUMMY_HOSPITALS[0];
      }
      hospital = DUMMY_HOSPITALS.find(h => h.email && h.email.trim().toLowerCase() === cleanEmail);
      if (hospital) {
        list.push(hospital);
        this.setHospitals(list);
      }
    }
    return hospital || null;
  },

  saveHospital(hospitalData) {
    const list = this.getHospitals();
    const existingIndex = list.findIndex(h => h.id === hospitalData.id);

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...hospitalData };
    } else {
      list.push(hospitalData);
    }
    this.setHospitals(list);
    return hospitalData;
  },

  updateHospitalInventory(hospitalId, component, bloodGroup, count) {
    const list = this.getHospitals();
    const hospital = list.find(h => h.id === hospitalId);
    if (!hospital) return false;

    if (!hospital.inventory) hospital.inventory = {};
    if (!hospital.inventory[component]) hospital.inventory[component] = {};

    hospital.inventory[component][bloodGroup] = Math.max(0, parseInt(count, 10) || 0);
    hospital.lastUpdated = new Date().toISOString();

    this.setHospitals(list);

    // If current logged in user is this hospital, sync currentUser
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === hospitalId) {
      this.setCurrentUser(hospital);
    }

    return true;
  },

  // Patient operations
  getPatients() {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error parsing patients from localStorage:', e);
      return [];
    }
  },

  setPatients(patients) {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  },

  getPatientByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const list = this.getPatients();
    let patient = list.find(p => p.email && p.email.trim().toLowerCase() === cleanEmail);
    if (!patient) {
      patient = DUMMY_PATIENTS.find(p => p.email && p.email.trim().toLowerCase() === cleanEmail);
      if (patient) {
        list.push(patient);
        this.setPatients(list);
      }
    }
    return patient || null;
  },

  savePatient(patientData) {
    const list = this.getPatients();
    const existingIndex = list.findIndex(p => p.id === patientData.id);

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...patientData };
    } else {
      list.push(patientData);
    }
    this.setPatients(list);
    return patientData;
  },

  // Patient Requests operations
  getRequests() {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REQUESTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error parsing requests from localStorage:', e);
      return [];
    }
  },

  setRequests(requests) {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
  },

  saveRequest(reqData) {
    const list = this.getRequests();
    const newReq = {
      id: reqData.id || 'req_' + Date.now(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      ...reqData
    };
    list.unshift(newReq);
    this.setRequests(list);
    return newReq;
  },

  updateRequestStatus(requestId, status, declineReason = '') {
    const list = this.getRequests();
    const req = list.find(r => r.id === requestId);
    if (!req) return null;

    req.status = status;
    if (status === 'Approved') {
      req.approvedAt = new Date().toISOString();
    } else if (status === 'Declined') {
      req.declinedAt = new Date().toISOString();
      req.declineReason = declineReason;
    }

    this.setRequests(list);
    return req;
  },

  // Session & Authentication operations
  getCurrentUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.showToast('You have been logged out successfully.', 'info');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 400);
  },

  // Network Statistics & Aggregations
  getNetworkStats() {
    const hospitals = this.getHospitals();
    let totalUnits = 0;
    const cities = new Set();

    hospitals.forEach(h => {
      if (h.city) cities.add(h.city);
      if (h.inventory) {
        Object.keys(h.inventory).forEach(comp => {
          Object.keys(h.inventory[comp] || {}).forEach(grp => {
            totalUnits += parseInt(h.inventory[comp][grp], 10) || 0;
          });
        });
      }
    });

    const requests = this.getRequests();
    const fulfilledRequests = requests.filter(r => r.status === 'Approved').length;

    return {
      totalHospitals: hospitals.length,
      totalUnits,
      citiesCount: cities.size,
      fulfilledRequests
    };
  },

  // Helper: Get stock badge classification
  getStockBadge(units) {
    const count = parseInt(units, 10) || 0;
    if (count > 10) {
      return {
        level: 'available',
        label: `${count} Units (Available)`,
        badgeClass: 'badge-available',
        color: '#15803d'
      };
    } else if (count >= 3) {
      return {
        level: 'low',
        label: `${count} Units (Low Stock)`,
        badgeClass: 'badge-low',
        color: '#b45309'
      };
    } else {
      return {
        level: 'critical',
        label: `${count} Units (Critical / Low)`,
        badgeClass: 'badge-critical',
        color: '#b91c1c'
      };
    }
  },

  // Format Relative Time (e.g. "15m ago", "2h ago", "yesterday")
  formatRelativeTime(isoString) {
    if (!isoString) return 'recently';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays} days ago`;
  },

  // Non-blocking Toast Notification System
  showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('bloodBridgeToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'bloodBridgeToastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSymbol = '&#9432;'; // info
    if (type === 'success') iconSymbol = '&#10003;';
    if (type === 'danger' || type === 'error') iconSymbol = '&#9888;';
    if (type === 'warning') iconSymbol = '&#9888;';

    toast.innerHTML = `
      <div class="toast-icon">${iconSymbol}</div>
      <div class="toast-body">${this.escapeHtml(message)}</div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 300);
    };

    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
  },

  // Security Helper: Escape HTML strings to prevent XSS
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

// Initialize database automatically on script load
StorageDB.init();

// Export globally
window.StorageDB = StorageDB;
window.BLOOD_GROUPS = BLOOD_GROUPS;
window.BLOOD_COMPONENTS = BLOOD_COMPONENTS;
window.RBC_COMPATIBILITY = RBC_COMPATIBILITY;
