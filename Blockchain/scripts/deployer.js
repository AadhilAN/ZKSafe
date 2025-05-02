const hh = require("hardhat");

async function main() {
  // Use the correct contract name from your verifier.sol file
  // (Groth16Verifier based on your previous error message)
  const Verifier = await hh.ethers.getContractFactory("Groth16Verifier");
  
  console.log("Deploying Groth16Verifier...");
  const verifier = await Verifier.deploy();
  
  
  await verifier.waitForDeployment();
  
  const address = await verifier.getAddress();
  console.log("Verifier deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });