import { ethers } from "hardhat";
async function main() {
  const StaticEtfContract = await ethers.deployContract("StaticEtf");
  console.log("SimpleDex address:", await StaticEtfContract.getAddress());

  const DynamicEtfContract = await ethers.deployContract("DynamicEtf");
  console.log("SimpleDex address:", await DynamicEtfContract.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });