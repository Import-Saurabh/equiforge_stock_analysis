// /server/processCompanyTest.js
const { processCompany } = require("./controllers/companyProcessor");

async function test() {
  const company = process.argv[2]; // Usage: node processCompanyTest.js TCS

  if (!company) {
    console.error("❌ Please provide a company symbol. Example:");
    console.error("   node processCompanyTest.js INFY");
    process.exit(1);
  }

  console.log(`🚀 Starting full processing for: ${company.toUpperCase()}`);
  const success = await processCompany(company.toUpperCase());

  if (success) {
    console.log(`✅ Successfully processed ${company}`);
  } else {
    console.log(`❌ Processing failed for ${company}`);
  }
}

test();
