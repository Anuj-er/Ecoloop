const hre = require("hardhat");

async function main() {
  console.log("Deploying EcoLoopEscrow contract...");

  // Get the ContractFactory and Signers
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the contract
  const EcoLoopEscrow = await hre.ethers.getContractFactory("EcoLoopEscrow");
  const ecoLoopEscrow = await EcoLoopEscrow.deploy();

  await ecoLoopEscrow.deployed();

  console.log("EcoLoopEscrow deployed to:", ecoLoopEscrow.address);

  // Save the contract address and ABI to a file for frontend integration
  const fs = require('fs');
  const contractInfo = {
    address: ecoLoopEscrow.address,
    network: "sepolia",
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    abi: JSON.parse(EcoLoopEscrow.interface.format('json'))
  };

  fs.writeFileSync(
    './deployment-info.json',
    JSON.stringify(contractInfo, null, 2)
  );

  console.log("Contract deployment information saved to deployment-info.json");
  console.log("\n🎉 Deployment completed successfully!");
  console.log("📝 Contract Address:", ecoLoopEscrow.address);
  console.log("🔗 View on Etherscan:", `https://sepolia.etherscan.io/address/${ecoLoopEscrow.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
