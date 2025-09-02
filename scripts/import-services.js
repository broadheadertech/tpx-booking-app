// Script to import services from CSV data into Convex
// Run this with: node scripts/import-services.js

const { ConvexHttpClient } = require("convex/browser");
const fs = require('fs');
const path = require('path');

// Initialize Convex client
const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://your-convex-deployment.convex.cloud");

// CSV data from the file
const csvData = `id,name,description,duration_minutes,price
1,Tipuno X Classico,"Consultation, Haircut",30,150.00
2,Tipuno X Signature,"Consultation, Haircut, Rinse Hot and Cold Towel Finish",60,500.00
3,Tipuno X Deluxe,"Consultation, Haircut, Hair Spa Treatment, Rinse Hot and Cold Towel Finish",90,800.00
4,Beard Shave/Shaping/Sculpting,More than a shave. It's a service you'll feel.,30,200.00
6,FACVNDO ELITE BARBERING SERVICE,"If you are looking for wedding haircuts, trust the elite hands that turn grooms into legends.",0,10000.00
7,Package 1,"Consultation, Haircut, Shaving, Styling",45,500.00
9,Package 2,"Consultation, Haircut, Hair Color or With Single Bleach, Rinse, Styling.\nNote: Short hair only, add 250 per length",60,850.00
10,Package 3,"Consultation, Haircut, Hair Color or With Single Bleach, Hair Spa Treatment, Rinse, Styling.\nNote: Short hair only, add 250 per length",60,1400.00
11,Mustache/Beard Trim,No Description with this product yet.,30,170.00
13,Hair Spa,No description for this service yet.,30,600.00
14,Hair and Scalp Treatment,No description for this product yet.,60,1500.00
15,Hair Color,No description for this product yet.,60,800.00
16,Perm,No description for this product yet.,60,1500.00
17,Hair Tattoo,No description for this product yet.,60,100.00`;

// Parse CSV data
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const services = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length >= 5) {
      services.push({
        name: values[1].replace(/"/g, ''),
        description: values[2].replace(/"/g, ''),
        duration_minutes: parseInt(values[3]) || 0,
        price: parseFloat(values[4]) || 0
      });
    }
  }
  
  return services;
}

// Main function to import services
async function importServices() {
  try {
    console.log('Parsing CSV data...');
    const services = parseCSV(csvData);
    
    console.log(`Found ${services.length} services to import:`);
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} - ₱${service.price} (${service.duration_minutes}min)`);
    });
    
    console.log('\nImporting services to Convex...');
    const result = await client.mutation("services/services:bulkInsertServices", {
      services: services
    });
    
    console.log('\n✅ Import completed successfully!');
    console.log(`Inserted ${result.insertedCount} services`);
    console.log('Service IDs:', result.serviceIds);
    
  } catch (error) {
    console.error('❌ Error importing services:', error);
    process.exit(1);
  }
}

// Run the import
if (require.main === module) {
  importServices();
}

module.exports = { importServices, parseCSV };