import { task } from 'hardhat/config';
import { DAO } from '../typechain';

task('deposit', 'Make deposit')
  .addParam('contract', 'DAO Contract address')
  .addParam('amount', 'Amount')
  .setAction(async (taskArgs, hre) => {
    const { contract, amount } = taskArgs;
    const dao: DAO = await hre.ethers.getContractAt('DAO', contract);

    const tx = await dao.deposit(amount);
    await tx.wait();
  });
