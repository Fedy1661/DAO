import { task } from 'hardhat/config';
import { DAO } from '../typechain';

task('addproposal', 'Add a proposal')
  .addParam('contract', 'DAO Contract address')
  .addParam('calldata', 'CallData')
  .addParam('recipient', 'Recipient address')
  .addParam('description', 'Description')
  .setAction(async (taskArgs, hre) => {
    const { contract, calldata, recipient, description } = taskArgs;
    const dao: DAO = await hre.ethers.getContractAt('DAO', contract);

    const tx = await dao.addProposal(calldata, recipient, description);
    await tx.wait();
    hre.ethers.constants.AddressZero;
  });
