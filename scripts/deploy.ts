import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import { DAO__factory } from '../typechain';

dotenv.config();

async function main() {
  const Dao: DAO__factory = <DAO__factory>await ethers.getContractFactory('DAO');
  const dao = await Dao.deploy(
    <string>process.env.CHAIRPERSON,
    <string>process.env.VOTE_TOKEN,
    <string>process.env.MINIMUM_QUORUM,
    <string>process.env.DEBATING_PERIOD_DURATION
  );

  await dao.deployed();

  console.log('DAO deployed to:', dao.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
