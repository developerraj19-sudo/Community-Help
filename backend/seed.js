// Run: node seed.js
// Seeds demo users: user, provider, admin
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/community-help';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const User = require('./models/User');
  const Provider = require('./models/Provider');

  // Clear existing demo accounts
  await User.deleteMany({});
  await Provider.deleteMany({});

  const plainPassword = 'demo1234';

  // Create User
  const user = await User.create({
    name: 'Demo User', email: 'user@demo.com', password: plainPassword,
    phone: '9876543210', role: 'user', isVerified: true,
    location: { type: 'Point', coordinates: [74.8560, 12.9141] },
  });

  const CATEGORIES = [
    { id: 'plumber', names: ['Ramesh Plumber', 'Srikanth Plumbing', 'A-1 Pipe Solutions', 'QuickFix Plumbing'], skills: ['pipe fitting', 'drainage'] },
    { id: 'electrician', names: ['Suresh Electrician', 'Prakash Wiring Works', 'Bright Spark Electricals', 'Rajesh Electrician'], skills: ['wiring', 'appliances'] },
    { id: 'carpenter', names: ['Mahesh Carpenter', 'Wooden Wonders', 'Crafted Wood Works', 'Sunil Carpenter'], skills: ['furniture', 'woodwork'] },
    { id: 'ac_repair', names: ['Cool Care AC', 'Breeze AC Services', 'Arctic Chill Repairs', 'Manoj AC Services'], skills: ['split AC', 'window AC'] },
    { id: 'appliance_repair', names: ['FixIt Appliances', 'HomeTech Repairs', 'Quick Service Appliances', 'Anand Electronics'], skills: ['washing machine', 'fridge'] },
    { id: 'water_tanker', names: ['Aqua Supply', 'Crystal Clear Water', 'Jal Jeevan Tankers', 'Metro Water Supply'], skills: ['bulk water', 'drinking water'] },
    { id: 'cleaning', names: ['Sparkle Clean', 'Pristine Home Cleaners', 'A to Z Cleaning', 'Fresh Spaces'], skills: ['deep cleaning', 'sofa cleaning'] },
    { id: 'maid', names: ['Lakshmi Maid Services', 'Trusted Hands', 'Kavitha Housekeeping', 'Shanti Domestic Help'], skills: ['housekeeping', 'cooking'] },
    { id: 'cook', names: ['Chef Sanjeev', 'Meena Home Foods', 'Taste of Home Cook', 'Karthik Kitchen'], skills: ['north indian', 'south indian'] },
    { id: 'caretaker', names: ['Compassion Care', 'Angel Caretakers', 'Elderly Support Services', 'Nirmala Nursing'], skills: ['elder care', 'baby sitting'] },
    { id: 'physiotherapy', names: ['Dr. Anand Physio', 'Mobility Rehab Clinic', 'Flexi Care Physiotherapy', 'Dr. Swati Sharma'], skills: ['back pain', 'rehab'] },
    { id: 'tutor', names: ['Saraswati Tuitions', 'Vidya Home Tutors', 'Rao Coaching Centre', 'Excel Academics'], skills: ['math', 'science'] },
  ];

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    
    // Create 4 providers per category
    for (let j = 0; j < 4; j++) {
      const email = `provider_${cat.id}_${j+1}@demo.com`;
      
      const pUser = await User.create({
        name: cat.names[j], email: email, password: plainPassword,
        phone: `887${i < 10 ? '0'+i : i}${j < 10 ? '0'+j : j}000`, role: 'provider', isVerified: true,
        location: { type: 'Point', coordinates: [74.858 + (i*0.001) + (j*0.002), 12.916 + (i*0.001) + (j*0.002)] },
      });
      
      await Provider.create({
        user: pUser._id, serviceCategory: cat.id, serviceType: 'utility',
        experience: Math.floor(Math.random() * 10) + 2, about: `Expert ${cat.id} with years of experience.`,
        workStyle: 'Professional and reliable.',
        skills: cat.skills,
        hourlyRate: 200 + (Math.floor(Math.random() * 100)), minimumCharge: 300, isApproved: true, isAvailable: true, rating: 4.0 + (Math.random()), totalJobs: Math.floor(Math.random() * 200),
        location: { type: 'Point', coordinates: [74.858 + (i*0.001) + (j*0.002), 12.916 + (i*0.001) + (j*0.002)] },
      });
    }
  }

  // Create Demo Company Provider
  const companyUser = await User.create({
    name: 'Reliance Utility Services', email: 'company@demo.com', password: plainPassword,
    phone: '8879999999', role: 'provider', isVerified: true,
    location: { type: 'Point', coordinates: [74.856, 12.914] },
  });
  
  await Provider.create({
    user: companyUser._id, serviceCategory: 'company', providerType: 'company', serviceType: 'utility',
    experience: 15, about: 'Premium enterprise utility services providing end-to-end solutions.',
    workStyle: 'Enterprise grade reliability and speed.',
    offeredServices: ['plumber', 'electrician', 'cleaning', 'ac_repair'],
    hourlyRate: 500, minimumCharge: 1000, isApproved: true, isAvailable: true, rating: 4.8, totalJobs: 1500,
    location: { type: 'Point', coordinates: [74.856, 12.914] },
  });

  // Create Admin
  await User.create({
    name: 'Admin', email: 'admin@demo.com', password: plainPassword,
    phone: '9876543212', role: 'admin', isVerified: true,
  });

  console.log('✅ Seed complete! Generated 48 providers total (4 per category).');
  console.log('User:       user@demo.com / demo1234');
  console.log('Admin:      admin@demo.com / demo1234');
  console.log('Providers:  provider_{category}_{1-4}@demo.com / demo1234');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
